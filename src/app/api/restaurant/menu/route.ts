import { NextResponse } from 'next/server';
import { and, eq, or } from 'drizzle-orm';
import { db, products, categories, diningTables } from '@/db';
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
