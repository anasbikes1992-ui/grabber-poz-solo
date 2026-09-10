import { NextResponse } from 'next/server';
import { and, eq, or } from 'drizzle-orm';
import { db, products, categories, diningTables, kitchenTickets } from '@/db';
import { hasDatabaseUrl } from '@/lib/db/connection';

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
    const body = await req.json();
    const { tableToken, items, guestNotes } = body as {
      tableToken: string;
      items: Array<{ name: string; qty: number; price: number; notes?: string }>;
      guestNotes?: string;
    };

    if (!tableToken || !Array.isArray(items) || !items.length) {
      return NextResponse.json({ success: false, error: 'tableToken and items[] are required' }, { status: 400 });
    }

    const [table] = await db
      .select()
      .from(diningTables)
      .where(eq(diningTables.qrToken, tableToken))
      .limit(1);

    if (!table) {
      return NextResponse.json({ success: false, error: 'Invalid or unassigned table QR token' }, { status: 404 });
    }

    const totalAmount = items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 1), 0);
    const kotNumber = `KOT-${Date.now().toString().slice(-6)}`;

    const [kot] = await db
      .insert(kitchenTickets)
      .values({
        kotNumber,
        tableId: table.id,
        waiterName: 'QR Self-Order',
        itemsJson: items.map((it) => ({
          name: it.name,
          qty: Number(it.qty) || 1,
          price: Number(it.price) || 0,
          notes: it.notes || guestNotes || undefined,
        })),
        totalAmount: totalAmount.toFixed(2),
        status: 'OPEN',
      })
      .returning();

    // Mark table as seated / ordered
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
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
