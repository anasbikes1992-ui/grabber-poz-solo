import { and, lte, gte } from 'drizzle-orm';
import { db, stockLots } from '@/db';
import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';

/** Flag lots expiring within 7 days for marketing agent / markdown suggestions. */
export async function suggestNearExpiryPromos() {
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86400000);

  const lots = await db
    .select()
    .from(stockLots)
    .where(and(lte(stockLots.expiryDate, week), gte(stockLots.qtyOnHand, 1)));

  if (!lots.length) return { suggested: 0 };

  const cfg = await readConfigJson();
  const hints = (cfg.nearExpiryHints as Array<Record<string, unknown>> | undefined) || [];
  const next = lots.map((lot) => ({
    lotId: lot.id,
    batchCode: lot.batchCode,
    productId: lot.productId,
    qtyOnHand: lot.qtyOnHand,
    expiryDate: lot.expiryDate?.toISOString(),
    suggestedDiscountPct: 15,
    createdAt: new Date().toISOString(),
  }));

  await mergeConfigJson({ nearExpiryHints: [...next, ...hints].slice(0, 50) });
  return { suggested: next.length };
}
