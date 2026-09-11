import { NextResponse } from 'next/server';
import { and, eq, inArray, or } from 'drizzle-orm';
import { db, products, categories, diningTables, kitchenTickets } from '@/db';
import { hasDatabaseUrl } from '@/lib/db/connection';

/** Simple IP rate limit for public guest POST (in-process; fine for Solo). */
const guestOrderHits = new Map<string, { count: number; resetAt: number }>();
const GUEST_ORDER_LIMIT = 20;
const GUEST_ORDER_WINDOW_MS = 60_000;

function assertGuestOrderRateLimit(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const now = Date.now();
  const row = guestOrderHits.get(ip);
  if (!row || now > row.resetAt) {
    guestOrderHits.set(ip, { count: 1, resetAt: now + GUEST_ORDER_WINDOW_MS });
    return;
  }
  row.count += 1;
  if (row.count > GUEST_ORDER_LIMIT) {
    throw Object.assign(new Error('Too many orders from this network — try again shortly'), {
      status: 429,
    });
  }
}

/** VERT-R06 — Public dining menu (no staff auth). */
export async function GET(req: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ success: false, error: 'Database not configured', items: [] }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const tableToken = searchParams.get('table');

    let table: { id: string; name: string; qrToken: string | null; status: string } | null = null;
    if (tableToken) {
      const [row] = await db
        .select({
          id: diningTables.id,
          name: diningTables.name,
          qrToken: diningTables.qrToken,
          status: diningTables.status,
        })
        .from(diningTables)
        .where(eq(diningTables.qrToken, tableToken))
        .limit(1);
      table = row || null;
    }

    const catalog = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          or(
            eq(products.itemType, 'PREPARED_FOOD'),
            eq(products.itemType, 'SERVICE'),
          ),
        ),
      )
      .limit(200);

    // Fallback: if no itemType-tagged foods yet, return active products in food-ish categories / all active limited
    let items = catalog;
    if (!items.length) {
      items = await db.select().from(products).where(eq(products.isActive, true)).limit(80);
    }

    const cats = await db.select().from(categories).limit(200);
    const catMap = new Map(cats.map((c) => [c.id, c.name]));

    return NextResponse.json({
      success: true,
      table,
      items: items.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        salePrice: Number(p.salePrice),
        description: p.description,
        imageUrl: p.imageUrl,
        itemType: p.itemType,
        category: (p.categoryId && catMap.get(p.categoryId)) || 'Menu',
      })),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message, items: [] }, { status: 500 });
  }
}

/** VERT-R06: Guest submits order from table QR -> kitchen ticket */
export async function POST(req: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 });
  }
  try {
    assertGuestOrderRateLimit(req);

    const body = await req.json();
    const { tableToken, items, guestNotes } = body as {
      tableToken: string;
      items: Array<{ productId: string; qty: number; notes?: string }>;
      guestNotes?: string;
    };

    if (!tableToken || !Array.isArray(items) || !items.length) {
      return NextResponse.json({ success: false, error: 'tableToken and items[] are required' }, { status: 400 });
    }

    const productIds = items.map((it) => String(it.productId || '').trim()).filter(Boolean);
    if (productIds.length !== items.length) {
      return NextResponse.json(
        { success: false, error: 'Each item requires productId (server resolves price/name)' },
        { status: 400 },
      );
    }

    const [table] = await db
      .select()
      .from(diningTables)
      .where(eq(diningTables.qrToken, tableToken))
      .limit(1);

    if (!table) {
      return NextResponse.json({ success: false, error: 'Invalid or unassigned table QR token' }, { status: 404 });
    }

    const catalogRows = await db
      .select({
        id: products.id,
        name: products.name,
        salePrice: products.salePrice,
        isActive: products.isActive,
        itemType: products.itemType,
      })
      .from(products)
      .where(
        and(
          inArray(products.id, productIds),
          eq(products.isActive, true),
          inArray(products.itemType, ['PREPARED_FOOD', 'SERVICE']),
        ),
      );

    const byId = new Map(catalogRows.map((p) => [p.id, p]));
    const resolved: Array<{ productId: string; name: string; qty: number; price: number; notes?: string }> = [];
    for (const it of items) {
      const pid = String(it.productId);
      const product = byId.get(pid);
      if (!product) {
        return NextResponse.json(
          { success: false, error: `Unknown, inactive, or non-menu product: ${pid}` },
          { status: 400 },
        );
      }
      const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 1)));
      resolved.push({
        productId: pid,
        name: product.name,
        qty,
        price: Number(product.salePrice),
        notes: it.notes || guestNotes || undefined,
      });
    }

    const totalAmount = resolved.reduce((sum, it) => sum + it.price * it.qty, 0);
    const kotNumber = `KOT-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;

    const [kot] = await db
      .insert(kitchenTickets)
      .values({
        kotNumber,
        tableId: table.id,
        waiterName: 'QR Self-Order',
        itemsJson: resolved,
        totalAmount: totalAmount.toFixed(2),
        status: 'OPEN',
      })
      .returning();

    await db
      .update(diningTables)
      .set({ status: 'ORDERED' })
      .where(eq(diningTables.id, table.id));

    return NextResponse.json({
      success: true,
      kotNumber: kot.kotNumber,
      tableId: table.id,
      tableName: table.name,
      totalAmount,
      message: 'Order sent directly to the kitchen display!',
    });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    return NextResponse.json({ success: false, error: (err as Error).message }, { status });
  }
}
