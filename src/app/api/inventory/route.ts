import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db, stockBalances, stockMovements, products, branches, warehouses } from '@/db';
import { requireStaffSession } from '@/lib/auth/session';

export async function GET() {
  try {
    await requireStaffSession();
    const balances = await db.select().from(stockBalances).limit(500);
    const movements = await db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt)).limit(50);
    const prods = await db.select().from(products).limit(500);
    const br = await db.select().from(branches);
    const wh = await db.select().from(warehouses);
    const pMap = new Map(prods.map((p) => [p.id, p]));
    const locMap = new Map<string, string>([
      ...br.map((b) => [b.id, b.name] as [string, string]),
      ...wh.map((w) => [w.id, w.name] as [string, string]),
    ]);

    return NextResponse.json({
      success: true,
      locations: {
        branches: br.map((b) => ({ id: b.id, name: b.name, type: 'BRANCH' as const })),
        warehouses: wh.map((w) => ({ id: w.id, name: w.name, type: 'WAREHOUSE' as const })),
      },
      balances: balances.map((b) => {
        const p = pMap.get(b.productId);
        return {
          id: b.id,
          locationId: b.locationId,
          location: locMap.get(b.locationId) || b.locationId,
          type: b.locationType,
          productId: b.productId,
          product: p?.name || b.productId,
          sku: p?.sku,
          onHand: b.onHand,
          reserved: b.reserved,
          available: b.onHand - b.reserved,
        };
      }),
      movements: movements.map((m) => ({
        id: m.id,
        type: m.type,
        delta: m.delta > 0 ? `+${m.delta}` : String(m.delta),
        location: locMap.get(m.locationId) || m.locationId,
        productId: m.productId,
        product: pMap.get(m.productId)?.name,
        ref: m.referenceId || m.referenceType || '—',
        date: m.createdAt,
      })),
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
