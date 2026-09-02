import { sql } from 'drizzle-orm';
import { db, orderItems, orders, products } from '@/db';
import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';

export type MarkdownSuggestion = {
  productId: string;
  sku: string;
  name: string;
  soldQty: number;
  onHandEstimate: number;
  sellThroughPct: number;
  suggestedDiscountPct: number;
  reason: string;
};

/** Velocity-based markdown suggestions at 30/45/60/90 day windows. */
export async function computeMarkdownSuggestions(windowDays = 45): Promise<MarkdownSuggestion[]> {
  const since = new Date(Date.now() - windowDays * 86400000);

  const rows = await db.execute(sql`
    SELECT oi.product_id AS product_id,
           SUM(oi.quantity)::int AS sold_qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= ${since}
    GROUP BY oi.product_id
  `);

  const soldMap = new Map<string, number>();
  for (const row of rows as unknown as Array<{ product_id: string; sold_qty: number }>) {
    soldMap.set(row.product_id, Number(row.sold_qty));
  }

  const catalog = await db.select().from(products).where(sql`${products.isActive} = true`);
  const suggestions: MarkdownSuggestion[] = [];

  for (const p of catalog) {
    const soldQty = soldMap.get(p.id) || 0;
    const onHandEstimate = Math.max(p.reorderLevel * 2, 20);
    const sellThroughPct = onHandEstimate > 0 ? Math.round((soldQty / onHandEstimate) * 100) : 0;

    if (sellThroughPct < 40 && soldQty < onHandEstimate * 0.4) {
      suggestions.push({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        soldQty,
        onHandEstimate,
        sellThroughPct,
        suggestedDiscountPct: sellThroughPct < 20 ? 25 : 15,
        reason: `${windowDays}d sell-through ${sellThroughPct}% — seasonal clearance`,
      });
    }
  }

  const cfg = await readConfigJson();
  await mergeConfigJson({ markdownSuggestions: suggestions.slice(0, 30), markdownComputedAt: new Date().toISOString() });
  return suggestions;
}
