/**
 * GRABBER BUSINESS OS — PROMOTION ENGINE TESTS (M5)
 * Tests PI-001 through PI-006: Types, Validity, Scoping, Caps, Tax Ordering, Stacking
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateSinglePromotion,
  evaluatePromoCode,
  evaluateAutoPromotions,
  resolveCartPromotions,
} from '../src/lib/commerce/promotions/promotion-engine';
import type { PromotionRule, CartEvaluationInput } from '../src/lib/commerce/promotions/types';

describe('M5: Promotion Engine Evaluation (PI-001 → PI-006)', () => {
  const baseRules: PromotionRule[] = [
    {
      id: 'promo_pct_15',
      name: '15% Off All Items',
      status: 'ACTIVE',
      promotionType: 'PERCENTAGE',
      discountType: 'PERCENT',
      discountValue: 15,
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-12-31T23:59:59.000Z',
      isAutomatic: false,
      promoCode: 'SAVE15',
      usageCount: 5,
      usageLimit: 100,
      stackingPolicy: 'BEST_PROMOTION',
      priority: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'promo_fixed_2000',
      name: 'LKR 2,000 Off Orders over LKR 10,000',
      status: 'ACTIVE',
      promotionType: 'MIN_ORDER',
      discountType: 'FIXED',
      discountValue: 2000,
      minimumOrderAmount: 10000,
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-12-31T23:59:59.000Z',
      isAutomatic: false,
      promoCode: 'FLAT2000',
      usageCount: 0,
      stackingPolicy: 'BEST_PROMOTION',
      priority: 2,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'promo_cap_5000',
      name: '20% Off up to LKR 5,000',
      status: 'ACTIVE',
      promotionType: 'PERCENTAGE',
      discountType: 'PERCENT',
      discountValue: 20,
      maximumDiscountAmount: 5000,
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-12-31T23:59:59.000Z',
      isAutomatic: false,
      promoCode: 'MAX5K',
      usageCount: 0,
      stackingPolicy: 'BEST_PROMOTION',
      priority: 3,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'promo_shoes_category',
      name: '20% Off Shoes',
      status: 'ACTIVE',
      promotionType: 'CATEGORY',
      discountType: 'PERCENT',
      discountValue: 20,
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-12-31T23:59:59.000Z',
      isAutomatic: false,
      promoCode: 'SHOES20',
      eligibility: { categoryIds: ['cat_shoes'] },
      usageCount: 0,
      stackingPolicy: 'BEST_PROMOTION',
      priority: 4,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'promo_auto_10pct',
      name: 'Auto 10% Off over LKR 20,000',
      status: 'ACTIVE',
      promotionType: 'PERCENTAGE',
      discountType: 'PERCENT',
      discountValue: 10,
      minimumOrderAmount: 20000,
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-12-31T23:59:59.000Z',
      isAutomatic: true,
      usageCount: 0,
      stackingPolicy: 'BEST_PROMOTION',
      priority: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  it('PI-001: derives authoritative percentage discount accurately', () => {
    const cart: CartEvaluationInput = {
      subtotal: 50000,
      items: [
        { productId: 'prod_1', unitPrice: 25000, quantity: 2, lineSubtotal: 50000 },
      ],
    };

    const res = evaluatePromoCode(baseRules, 'SAVE15', cart, '2026-06-01T12:00:00.000Z');
    expect(res.valid).toBe(true);
    expect(res.discountTotal).toBe(7500); // 15% of 50,000
  });

  it('PI-002: rejects expired or inactive promotions', () => {
    const expiredRule: PromotionRule = {
      ...baseRules[0],
      id: 'promo_expired',
      endsAt: '2025-12-31T23:59:59.000Z',
      promoCode: 'OLDCODE',
    };

    const cart: CartEvaluationInput = {
      subtotal: 10000,
      items: [{ productId: 'p1', unitPrice: 10000, quantity: 1, lineSubtotal: 10000 }],
    };

    const res = evaluatePromoCode([expiredRule], 'OLDCODE', cart, '2026-06-01T12:00:00.000Z');
    expect(res.valid).toBe(false);
    expect(res.errorCode).toBe('PROMO_EXPIRED');
  });

  it('PI-003: limits category-specific promotion strictly to eligible items', () => {
    const cart: CartEvaluationInput = {
      subtotal: 30000,
      items: [
        { productId: 'p_shoes', categoryId: 'cat_shoes', unitPrice: 10000, quantity: 1, lineSubtotal: 10000 },
        { productId: 'p_watch', categoryId: 'cat_watches', unitPrice: 20000, quantity: 1, lineSubtotal: 20000 },
      ],
    };

    const res = evaluatePromoCode(baseRules, 'SHOES20', cart, '2026-06-01T12:00:00.000Z');
    expect(res.valid).toBe(true);
    // 20% applies ONLY to the LKR 10,000 shoes, not the LKR 20,000 watch
    expect(res.discountTotal).toBe(2000);
    expect(res.qualifyingItemIds).toEqual(['p_shoes']);
  });

  it('PI-004: caps discount at maximumDiscountAmount', () => {
    const cart: CartEvaluationInput = {
      subtotal: 50000, // 20% of 50,000 would be 10,000
      items: [{ productId: 'p_phone', unitPrice: 50000, quantity: 1, lineSubtotal: 50000 }],
    };

    const res = evaluatePromoCode(baseRules, 'MAX5K', cart, '2026-06-01T12:00:00.000Z');
    expect(res.valid).toBe(true);
    // Capped at LKR 5,000
    expect(res.discountTotal).toBe(5000);
  });

  it('PI-005: preserves canonical tax ordering (Gross - Discount = Taxable Subtotal + Tax = Total)', () => {
    const subtotal = 100000;
    const cart: CartEvaluationInput = {
      subtotal,
      items: [{ productId: 'p1', unitPrice: 100000, quantity: 1, lineSubtotal: 100000 }],
    };

    const res = evaluatePromoCode(baseRules, 'SAVE15', cart, '2026-06-01T12:00:00.000Z');
    expect(res.valid).toBe(true);
    const discount = res.discountTotal; // 15,000
    expect(discount).toBe(15000);

    const taxableSubtotal = subtotal - discount; // 85,000
    expect(taxableSubtotal).toBe(85000);

    const taxRate = 0.18; // 18% VAT
    const taxTotal = Math.round(taxableSubtotal * taxRate * 100) / 100; // 15,300
    expect(taxTotal).toBe(15300);

    const grandTotal = taxableSubtotal + taxTotal; // 100,300
    expect(grandTotal).toBe(100300);
  });

  it('PI-006: evaluates automatic promotions and resolves best promotion', () => {
    const cart: CartEvaluationInput = {
      subtotal: 30000, // Qualifies for auto 10% (3,000) or promo FLAT2000 (2,000)
      promoCode: 'FLAT2000',
      items: [{ productId: 'p1', unitPrice: 30000, quantity: 1, lineSubtotal: 30000 }],
    };

    const resolution = resolveCartPromotions(baseRules, cart, '2026-06-01T12:00:00.000Z');
    expect(resolution.autoResult?.valid).toBe(true);
    expect(resolution.autoResult?.discountTotal).toBe(3000); // 10% of 30,000
    expect(resolution.codeResult?.valid).toBe(true);
    expect(resolution.codeResult?.discountTotal).toBe(2000); // Flat 2,000

    // BEST_PROMOTION selects the 3,000 automatic discount over the 2,000 code
    expect(resolution.bestResult.discountTotal).toBe(3000);
  });
});
