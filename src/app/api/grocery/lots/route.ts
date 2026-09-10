import { NextResponse } from 'next/server';
import { and, asc, desc, eq, ilike, lte, or, sql } from 'drizzle-orm';
import { db, stockLots, products, productVariants, branches, warehouses, stockBalances, stockMovements } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId, requireStaffSession } from '@/lib/auth/session';
import { receiveStockLot } from '@/lib/inventory/fefo';
import { recordPurchaseReceipt } from '@/lib/inventory/stock-service';

export async function GET(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV === 'test') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      await requireStaffSession();
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'ALL'; // ALL, EXPIRED, CRITICAL, WARNING, GOOD, NO_EXPIRY
    const locationIdFilter = searchParams.get('locationId');
    const search = searchParams.get('search')?.trim().toLowerCase();

    const [allLots, allProducts, allVariants, allBranches, allWarehouses] = await Promise.all([
      db.select().from(stockLots).orderBy(asc(stockLots.expiryDate), asc(stockLots.receivedAt)),
      db.select().from(products),
      db.select().from(productVariants),
      db.select().from(branches),
      db.select().from(warehouses),
    ]);

    const prodMap = new Map(allProducts.map((p) => [p.id, p]));
    const varMap = new Map(allVariants.map((v) => [v.id, v]));
    const locMap = new Map<string, { name: string; type: 'BRANCH' | 'WAREHOUSE' }>([
      ...allBranches.map((b) => [b.id, { name: b.name, type: 'BRANCH' as const }] as [string, { name: string; type: 'BRANCH' | 'WAREHOUSE' }]),
      ...allWarehouses.map((w) => [w.id, { name: w.name, type: 'WAREHOUSE' as const }] as [string, { name: string; type: 'BRANCH' | 'WAREHOUSE' }]),
    ]);

    const now = new Date();
    const nowMs = now.getTime();

    const enriched = allLots.map((lot) => {
      const p = prodMap.get(lot.productId);
      const v = lot.variantId ? varMap.get(lot.variantId) : undefined;
      const loc = locMap.get(lot.locationId);

      let daysToExpiry: number | null = null;
      let status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD' | 'NO_EXPIRY' = 'NO_EXPIRY';

      if (lot.expiryDate) {
        const expMs = new Date(lot.expiryDate).getTime();
        daysToExpiry = Math.ceil((expMs - nowMs) / (1000 * 60 * 60 * 24));
        if (daysToExpiry < 0) {
          status = 'EXPIRED';
        } else if (daysToExpiry <= 7) {
          status = 'CRITICAL';
        } else if (daysToExpiry <= 30) {
          status = 'WARNING';
        } else {
          status = 'GOOD';
        }
      }

      return {
        id: lot.id,
        batchCode: lot.batchCode,
        productId: lot.productId,
        productName: p?.name || 'Unknown Product',
        productSku: p?.sku || '',
        productImageUrl: p?.imageUrl || null,
        productSalePrice: p ? Number(p.salePrice) : 0,
        variantId: lot.variantId,
        variantName: v?.name || null,
        locationType: lot.locationType,
        locationId: lot.locationId,
        locationName: loc?.name || lot.locationId,
        qtyOnHand: lot.qtyOnHand,
        expiryDate: lot.expiryDate ? new Date(lot.expiryDate).toISOString() : null,
        receivedAt: lot.receivedAt ? new Date(lot.receivedAt).toISOString() : null,
        daysToExpiry,
        status,
      };
    });

    // Compute summary metrics across all lots
    const summary = {
      totalLots: enriched.length,
      totalUnits: enriched.reduce((acc, l) => acc + l.qtyOnHand, 0),
      expiredCount: enriched.filter((l) => l.status === 'EXPIRED').length,
      criticalCount: enriched.filter((l) => l.status === 'CRITICAL').length,
      warningCount: enriched.filter((l) => l.status === 'WARNING').length,
      goodCount: enriched.filter((l) => l.status === 'GOOD' || l.status === 'NO_EXPIRY').length,
    };

    // Apply filtering
    let filtered = enriched;
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((l) => l.status === statusFilter);
    }
    if (locationIdFilter) {
      filtered = filtered.filter((l) => l.locationId === locationIdFilter);
    }
    if (search) {
      filtered = filtered.filter(
        (l) =>
          l.batchCode.toLowerCase().includes(search) ||
          l.productName.toLowerCase().includes(search) ||
          l.productSku.toLowerCase().includes(search),
      );
    }

    return NextResponse.json({
      success: true,
      summary,
      lots: filtered,
      locations: {
        branches: allBranches.map((b) => ({ id: b.id, name: b.name, type: 'BRANCH' as const })),
        warehouses: allWarehouses.map((w) => ({ id: w.id, name: w.name, type: 'WAREHOUSE' as const })),
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Failed to fetch lots' }, { status: e.status || 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && (process.env.NODE_ENV !== 'production')) {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const {
      batchCode,
      productId,
      variantId,
      locationType = 'BRANCH',
      locationId,
      qty,
      expiryDate,
      unitCost,
    } = body as {
      batchCode: string;
      productId: string;
      variantId?: string | null;
      locationType?: 'BRANCH' | 'WAREHOUSE';
      locationId: string;
      qty: number;
      expiryDate?: string | null;
      unitCost?: number;
    };

    if (!batchCode?.trim() || !productId || !locationId || !qty || qty <= 0) {
      return NextResponse.json(
        { success: false, error: 'batchCode, productId, locationId, and positive qty are required' },
        { status: 400 },
      );
    }

    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;

    const lotId = await db.transaction(async (tx) => {
      // 1. Receive into FEFO lot table
      const id = await receiveStockLot(tx, {
        batchCode: batchCode.trim(),
        productId,
        variantId: variantId || null,
        locationType,
        locationId,
        qty,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      });

      // 2. Record inventory receipt to update on-hand balance and movement ledger
      await recordPurchaseReceipt(
        tx,
        { locationType, locationId },
        {
          productId,
          variantId: variantId || null,
          quantity: qty,
          unitCost: unitCost || 0,
        },
        {
          referenceType: 'GROCERY_GRN',
          referenceId: batchCode.trim(),
          actorId: actorId || null,
          notes: `Grocery Lot Intake ${batchCode.trim()}`,
        },
      );

      return id;
    });

    return NextResponse.json({
      success: true,
      lotId,
      message: `Batch ${batchCode} received successfully (${qty} units)`,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Failed to receive lot' }, { status: e.status || 500 });
  }
}
