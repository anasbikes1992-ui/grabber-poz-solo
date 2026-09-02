import { sql } from 'drizzle-orm';
import { db, products, stockBalances } from '@/db';
import { mergeConfigJson } from '@/lib/config/business-settings';
import { enqueueJob } from '@/lib/jobs/outbox';

export type ReorderSuggestion = {
  productId: string;
  sku: string;
  name: string;
  onHand: number;
  reserved: number;
  reorderLevel: number;
  avgDailyDemand: number;
  safetyStock: number;
  reorderPoint: number;
  suggestedOrderQty: number;
};

/** ROP = d̄ × LT + SS; SS = Z × sqrt(LT × σd²) simplified. */
export async function computeReorderSuggestions(config?: {
  leadTimeDays?: number;
  zScore?: number;
}): Promise<ReorderSuggestion[]> {
  const leadTime = config?.leadTimeDays ?? 7;
  const z = config?.zScore ?? 1.65;

  const demandRows = await db.execute(sql`
    SELECT oi.product_id, SUM(oi.quantity)::float / 30 AS avg_daily
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY oi.product_id
  `);

  const demandMap = new Map<string, number>();
  for (const row of demandRows as unknown as Array<{ product_id: string; avg_daily: number }>) {
    demandMap.set(row.product_id, Number(row.avg_daily) || 0);
  }

  const balances = await db.select().from(stockBalances);
  const onHandByProduct = new Map<string, { onHand: number; reserved: number }>();
  for (const b of balances) {
    const cur = onHandByProduct.get(b.productId) || { onHand: 0, reserved: 0 };
    cur.onHand += Number(b.onHand);
    cur.reserved += Number(b.reserved);
    onHandByProduct.set(b.productId, cur);
  }

  const catalog = await db.select().from(products).where(sql`${products.isActive} = true`);
  const suggestions: ReorderSuggestion[] = [];

  for (const p of catalog) {
    const d = demandMap.get(p.id) || 0;
    const ss = Math.ceil(z * Math.sqrt(leadTime) * Math.max(d, 0.5));
    const rop = Math.ceil(d * leadTime + ss);
    const stock = onHandByProduct.get(p.id) || { onHand: 0, reserved: 0 };
    const position = stock.onHand - stock.reserved;

    if (position <= rop || position <= p.reorderLevel) {
      const casePack = Math.max(p.reorderLevel, 10);
      const suggestedOrderQty = Math.max(casePack, rop - position + casePack);
      suggestions.push({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        onHand: stock.onHand,
        reserved: stock.reserved,
        reorderLevel: p.reorderLevel,
        avgDailyDemand: Math.round(d * 100) / 100,
        safetyStock: ss,
        reorderPoint: rop,
        suggestedOrderQty,
      });
    }
  }

  await mergeConfigJson({ reorderSuggestions: suggestions.slice(0, 50), reorderComputedAt: new Date().toISOString() });

  for (const s of suggestions.slice(0, 5)) {
    await enqueueJob({
      type: 'DRAFT_PO',
      idempotencyKey: `rop_${s.productId}_${new Date().toISOString().slice(0, 10)}`,
      payload: { productId: s.productId, qty: s.suggestedOrderQty },
    });
  }

  return suggestions;
}
