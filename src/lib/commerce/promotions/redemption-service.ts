/**
 * GRABBER BUSINESS OS — PROMOTION REDEMPTION SERVICE (M5)
 * Enforces PI-007 (Usage Limits) & PI-008 (Idempotent Redemption)
 */

import { eq } from 'drizzle-orm';
import { db, businessConfig } from '@/db';
import type { PromotionRule, PromotionRedemptionRecord } from './types';

export class PromotionRedemptionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'PromotionRedemptionError';
  }
}

export async function getPromotionStoreData(): Promise<{
  rowId?: string;
  promotions: PromotionRule[];
  redemptions: PromotionRedemptionRecord[];
}> {
  const [row] = await db.select().from(businessConfig).limit(1);
  const cfg = (row?.configJson || {}) as Record<string, any>;
  const promotions = (cfg.promotions as PromotionRule[] | undefined) || [];
  const redemptions = (cfg.promotionRedemptions as PromotionRedemptionRecord[] | undefined) || [];

  return {
    rowId: row?.id,
    promotions,
    redemptions,
  };
}

export async function getCustomerRedemptionCount(
  promotionId: string,
  identifier: { customerId?: string; customerPhone?: string },
): Promise<number> {
  const { redemptions } = await getPromotionStoreData();
  return redemptions.filter((r) => {
    if (r.promotionId !== promotionId) return false;
    if (identifier.customerId && r.customerId === identifier.customerId) return true;
    if (identifier.customerPhone && r.customerPhone === identifier.customerPhone) return true;
    return false;
  }).length;
}

export async function recordPromotionRedemptionTx(input: {
  promotionId: string;
  orderId: string;
  discountAmount: number;
  customerId?: string;
  customerPhone?: string;
  promoCode?: string;
}): Promise<{ success: boolean; redemption: PromotionRedemptionRecord; isDuplicate: boolean }> {
  const [row] = await db.select().from(businessConfig).limit(1);
  if (!row) {
    throw new PromotionRedemptionError('BUSINESS_CONFIG_MISSING', 'Business configuration record not found');
  }

  const cfg = (row.configJson || {}) as Record<string, any>;
  const promotions: PromotionRule[] = [...(cfg.promotions || [])];
  const redemptions: PromotionRedemptionRecord[] = [...(cfg.promotionRedemptions || [])];

  // 1. PI-008 Idempotency check: (promotionId, orderId)
  const existingRedemption = redemptions.find(
    (r) => r.promotionId === input.promotionId && r.orderId === input.orderId,
  );
  if (existingRedemption) {
    return { success: true, redemption: existingRedemption, isDuplicate: true };
  }

  // 2. Find rule
  const ruleIdx = promotions.findIndex((p) => p.id === input.promotionId);
  if (ruleIdx === -1) {
    throw new PromotionRedemptionError('PROMOTION_NOT_FOUND', `Promotion "${input.promotionId}" not found`);
  }
  const rule = { ...promotions[ruleIdx] };

  // 3. PI-007: Check global usage limit
  if (rule.usageLimit != null && rule.usageCount >= rule.usageLimit) {
    throw new PromotionRedemptionError(
      'USAGE_LIMIT_EXHAUSTED',
      `Promotion usage limit (${rule.usageLimit}) has already been reached`,
    );
  }

  // 4. PI-007: Check per-customer limit
  if (rule.perCustomerLimit != null && (input.customerId || input.customerPhone)) {
    const custCount = redemptions.filter((r) => {
      if (r.promotionId !== input.promotionId) return false;
      if (input.customerId && r.customerId === input.customerId) return true;
      if (input.customerPhone && r.customerPhone === input.customerPhone) return true;
      return false;
    }).length;

    if (custCount >= rule.perCustomerLimit) {
      throw new PromotionRedemptionError(
        'CUSTOMER_LIMIT_REACHED',
        `Per-customer redemption limit (${rule.perCustomerLimit}) reached for this promotion`,
      );
    }
  }

  // 5. Increment usage count and create record
  rule.usageCount = (rule.usageCount || 0) + 1;
  promotions[ruleIdx] = rule;

  const newRedemption: PromotionRedemptionRecord = {
    id: `red_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    promotionId: input.promotionId,
    orderId: input.orderId,
    customerId: input.customerId,
    customerPhone: input.customerPhone,
    promoCode: input.promoCode || rule.promoCode,
    discountAmount: input.discountAmount,
    redeemedAt: new Date().toISOString(),
  };

  redemptions.push(newRedemption);

  // 6. Persist atomic update to DB
  await db
    .update(businessConfig)
    .set({
      configJson: {
        ...cfg,
        promotions,
        promotionRedemptions: redemptions,
      },
      updatedAt: new Date(),
    })
    .where(eq(businessConfig.id, row.id));

  return { success: true, redemption: newRedemption, isDuplicate: false };
}
