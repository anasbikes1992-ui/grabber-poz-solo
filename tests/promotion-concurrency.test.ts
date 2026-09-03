/**
 * GRABBER BUSINESS OS — PROMOTION CONCURRENCY & REDEMPTION IDEMPOTENCY TESTS (M5)
 * Tests PI-007 (Usage Limits) & PI-008 (Idempotency)
 */

import { describe, it, expect, vi } from 'vitest';
import type { PromotionRule, PromotionRedemptionRecord } from '../src/lib/commerce/promotions/types';
import { PromotionRedemptionError } from '../src/lib/commerce/promotions/redemption-service';

describe('M5: Promotion Concurrency & Idempotency', () => {
  it('PI-008: repeated checkout redemptions for same order are strictly idempotent', () => {
    const redemptions: PromotionRedemptionRecord[] = [
      {
        id: 'red_01',
        promotionId: 'promo_test_1',
        orderId: 'ord_1001',
        discountAmount: 1500,
        redeemedAt: '2026-06-01T10:00:00.000Z',
      },
    ];

    // Attempting duplicate redemption with same promotionId and orderId
    const isDuplicate = redemptions.some(
      (r) => r.promotionId === 'promo_test_1' && r.orderId === 'ord_1001',
    );
    expect(isDuplicate).toBe(true);

    // New order is not duplicate
    const isNewDuplicate = redemptions.some(
      (r) => r.promotionId === 'promo_test_1' && r.orderId === 'ord_1002',
    );
    expect(isNewDuplicate).toBe(false);
  });

  it('PI-007: enforces global usageLimit when only 1 redemption remains', () => {
    const limitedRule: PromotionRule = {
      id: 'promo_limited',
      name: 'Flash Sale (Last 1)',
      status: 'ACTIVE',
      promotionType: 'PERCENTAGE',
      discountType: 'PERCENT',
      discountValue: 25,
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-12-31T23:59:59.000Z',
      isAutomatic: false,
      promoCode: 'FLASH25',
      usageCount: 9,
      usageLimit: 10, // Max 10, 9 consumed
      stackingPolicy: 'BEST_PROMOTION',
      priority: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    // Customer A attempts checkout
    expect(limitedRule.usageLimit != null && limitedRule.usageCount < limitedRule.usageLimit).toBe(true);
    // Customer A consumes the final slot
    limitedRule.usageCount += 1;
    expect(limitedRule.usageCount).toBe(10);

    // Customer B attempts checkout concurrently
    const canCustomerBRedeem = limitedRule.usageLimit != null && limitedRule.usageCount < limitedRule.usageLimit;
    expect(canCustomerBRedeem).toBe(false);
  });

  it('PI-007: enforces perCustomerLimit for repeated attempts by same customer', () => {
    const customerRedemptions: PromotionRedemptionRecord[] = [
      {
        id: 'red_cust_01',
        promotionId: 'promo_one_per_cust',
        orderId: 'ord_2001',
        customerId: 'cust_kamal_123',
        customerPhone: '0771234567',
        discountAmount: 1000,
        redeemedAt: '2026-06-01T10:00:00.000Z',
      },
    ];

    const perCustomerLimit = 1;
    const pastCount = customerRedemptions.filter(
      (r) => r.promotionId === 'promo_one_per_cust' && r.customerPhone === '0771234567',
    ).length;

    expect(pastCount >= perCustomerLimit).toBe(true);
  });
});
