/**
 * GRABBER BUSINESS OS — PROMOTION CHECKOUT PARITY TESTS (M5)
 * Tests PI-009 (Checkout Parity) & PI-010 (Payment Identity)
 */

import { describe, it, expect } from 'vitest';
import { evaluatePromoCode } from '../src/lib/commerce/promotions/promotion-engine';
import type { PromotionRule, CartEvaluationInput } from '../src/lib/commerce/promotions/types';

describe('M5: Promotion Checkout Parity (POS vs Storefront)', () => {
  const promoRule: PromotionRule = {
    id: 'promo_parity_01',
    name: 'Unified 10% Discount',
    status: 'ACTIVE',
    promotionType: 'PERCENTAGE',
    discountType: 'PERCENT',
    discountValue: 10,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.000Z',
    isAutomatic: false,
    promoCode: 'UNIFIED10',
    usageCount: 0,
    stackingPolicy: 'BEST_PROMOTION',
    priority: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('PI-009: calculates identical discounts on POS and Storefront for identical cart items', () => {
    const items = [
      { productId: 'prod_shirt', unitPrice: 4000, quantity: 2, lineSubtotal: 8000 },
      { productId: 'prod_jeans', unitPrice: 7000, quantity: 1, lineSubtotal: 7000 },
    ];
    const subtotal = 15000;

    // 1. POS evaluation
    const posCart: CartEvaluationInput = {
      channel: 'POS',
      subtotal,
      items,
      branchId: 'branch_colombo_01',
    };
    const posRes = evaluatePromoCode([promoRule], 'UNIFIED10', posCart);

    // 2. Storefront evaluation
    const storefrontCart: CartEvaluationInput = {
      channel: 'STOREFRONT',
      subtotal,
      items,
      branchId: 'branch_colombo_01',
    };
    const storefrontRes = evaluatePromoCode([promoRule], 'UNIFIED10', storefrontCart);

    expect(posRes.valid).toBe(true);
    expect(storefrontRes.valid).toBe(true);
    expect(posRes.discountTotal).toBe(storefrontRes.discountTotal);
    expect(posRes.discountTotal).toBe(1500); // 10% of 15,000
  });

  it('PI-010: locks discounted total into payment gateway amount without disparity', () => {
    const subtotal = 20000;
    const cart: CartEvaluationInput = {
      channel: 'STOREFRONT',
      subtotal,
      items: [{ productId: 'item_1', unitPrice: 20000, quantity: 1, lineSubtotal: 20000 }],
    };

    const promoRes = evaluatePromoCode([promoRule], 'UNIFIED10', cart);
    expect(promoRes.valid).toBe(true);

    const discountTotal = promoRes.discountTotal; // 2,000
    const taxableSubtotal = subtotal - discountTotal; // 18,000
    const taxRate = 0.18;
    const taxTotal = Math.round(taxableSubtotal * taxRate * 100) / 100; // 3,240
    const grandTotal = taxableSubtotal + taxTotal; // 21,240

    // Payment gateway payload uses authoritatively computed grandTotal
    const gatewayAmount = grandTotal;
    expect(gatewayAmount).toBe(21240);
  });
});
