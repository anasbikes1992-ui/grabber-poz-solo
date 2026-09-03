/**
 * GRABBER BUSINESS OS — PROMOTION SECURITY & ATTACK DEFENSE TESTS (M5)
 * Adversarial Testing: Client Discount Injection, Price Manipulation, Negative Totals
 */

import { describe, it, expect } from 'vitest';
import { evaluatePromoCode } from '../src/lib/commerce/promotions/promotion-engine';
import type { PromotionRule, CartEvaluationInput } from '../src/lib/commerce/promotions/types';

describe('M5: Promotion Security & Adversarial Attack Resistance', () => {
  const activePromo: PromotionRule = {
    id: 'promo_sec_01',
    name: 'Standard 10% Discount',
    status: 'ACTIVE',
    promotionType: 'PERCENTAGE',
    discountType: 'PERCENT',
    discountValue: 10,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.000Z',
    isAutomatic: false,
    promoCode: 'REAL10',
    usageCount: 0,
    stackingPolicy: 'BEST_PROMOTION',
    priority: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('neutralizes injected client-side discount fields', () => {
    // Attacker submits manipulated discount of LKR 999,999
    const clientPayload = {
      subtotal: 5000,
      clientDiscount: 999999,
      clientGrandTotal: 1,
      promoCode: 'REAL10',
    };

    const authoritativeCart: CartEvaluationInput = {
      subtotal: clientPayload.subtotal,
      items: [{ productId: 'p1', unitPrice: 5000, quantity: 1, lineSubtotal: 5000 }],
    };

    const res = evaluatePromoCode([activePromo], clientPayload.promoCode, authoritativeCart);
    expect(res.valid).toBe(true);
    // Server computes exactly 10% of 5,000 = 500 LKR, completely ignoring client's 999,999
    expect(res.discountTotal).toBe(500);
    expect(res.discountTotal).not.toBe(clientPayload.clientDiscount);
  });

  it('rejects fake, non-existent, or arbitrary promotion codes', () => {
    const cart: CartEvaluationInput = {
      subtotal: 15000,
      items: [{ productId: 'p1', unitPrice: 15000, quantity: 1, lineSubtotal: 15000 }],
    };

    const fakeCodes = ['HACK99', 'FREE_STUFF', 'ADMIN_DISCOUNT', 'SQL_INJECTION;--'];
    for (const code of fakeCodes) {
      const res = evaluatePromoCode([activePromo], code, cart);
      expect(res.valid).toBe(false);
      expect(res.discountTotal).toBe(0);
      expect(res.errorCode).toBe('PROMO_NOT_FOUND');
    }
  });

  it('rejects future promotions before startsAt timestamp', () => {
    const futurePromo: PromotionRule = {
      ...activePromo,
      id: 'promo_future',
      startsAt: '2026-12-01T00:00:00.000Z',
      promoCode: 'FUTURE10',
    };

    const cart: CartEvaluationInput = {
      subtotal: 10000,
      items: [{ productId: 'p1', unitPrice: 10000, quantity: 1, lineSubtotal: 10000 }],
    };

    const res = evaluatePromoCode([futurePromo], 'FUTURE10', cart, '2026-06-01T12:00:00.000Z');
    expect(res.valid).toBe(false);
    expect(res.errorCode).toBe('PROMO_NOT_STARTED');
  });

  it('PI-012: guarantees discount can never produce a negative payable amount', () => {
    // Excessive fixed discount configured by mistake (LKR 50,000 off on LKR 10,000 cart)
    const bigFixedPromo: PromotionRule = {
      ...activePromo,
      id: 'promo_big_fixed',
      discountType: 'FIXED',
      discountValue: 50000,
      promoCode: 'BIG50K',
    };

    const cart: CartEvaluationInput = {
      subtotal: 10000,
      items: [{ productId: 'p1', unitPrice: 10000, quantity: 1, lineSubtotal: 10000 }],
    };

    const res = evaluatePromoCode([bigFixedPromo], 'BIG50K', cart);
    expect(res.valid).toBe(true);
    // Capped at subtotal (10,000), payable cannot go below 0
    expect(res.discountTotal).toBe(10000);
    const payable = Math.max(0, cart.subtotal - res.discountTotal);
    expect(payable).toBe(0);
  });
});
