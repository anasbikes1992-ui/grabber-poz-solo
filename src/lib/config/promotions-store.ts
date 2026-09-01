import { eq } from 'drizzle-orm';
import { db, businessConfig } from '@/db';
import {
  DEFAULT_PROMOTIONS,
  incrementPromotionUsage,
  type PromotionRule,
} from '@/lib/commerce/promotion-engine';

async function readRow() {
  const [row] = await db.select().from(businessConfig).limit(1);
  return row;
}

export async function listPromotions(): Promise<PromotionRule[]> {
  const row = await readRow();
  const cfg = (row?.configJson || {}) as Record<string, unknown>;
  const rules = (cfg.promotions as PromotionRule[] | undefined) || [];
  return rules.length ? rules : DEFAULT_PROMOTIONS;
}

export async function savePromotions(rules: PromotionRule[]) {
  let row = await readRow();
  if (!row) {
    const [created] = await db
      .insert(businessConfig)
      .values({ configJson: { promotions: rules }, vertical: 'fashion' })
      .returning();
    row = created;
    return rules;
  }
  const prev = (row.configJson || {}) as Record<string, unknown>;
  await db
    .update(businessConfig)
    .set({ configJson: { ...prev, promotions: rules }, updatedAt: new Date() })
    .where(eq(businessConfig.id, row.id));
  return rules;
}

export async function recordPromotionRedemption(ruleId: string) {
  const rules = await listPromotions();
  const updated = incrementPromotionUsage(rules, ruleId);
  await savePromotions(updated);
}
