import { describe, it, expect } from 'vitest';
import { resolveCheckoutStatuses, applyOrderTransitions } from '../src/lib/commerce/order-lifecycle';
import { evaluatePromotion, DEFAULT_PROMOTIONS } from '../src/lib/commerce/promotion-engine';

describe('order-lifecycle', () => {
  it('POS cash checkout completes immediately', () => {
    const s = resolveCheckoutStatuses('POS', 'CASH');
    expect(s.orderStatus).toBe('DELIVERED');
    expect(s.paymentStatus).toBe('PAID');
    expect(s.fulfillmentStatus).toBe('DELIVERED');
  });

  it('storefront COD stays pending until delivery', () => {
    const s = resolveCheckoutStatuses('STOREFRONT', 'COD');
    expect(s.orderStatus).toBe('CONFIRMED');
    expect(s.paymentStatus).toBe('PENDING');
    expect(s.fulfillmentStatus).toBe('PENDING');
  });

  it('storefront card moves to assigned fulfillment', () => {
    const s = resolveCheckoutStatuses('STOREFRONT', 'CARD');
    expect(s.orderStatus).toBe('CONFIRMED');
    expect(s.paymentStatus).toBe('PAID');
    expect(s.fulfillmentStatus).toBe('ASSIGNED');
  });

  it('applies valid order transition presets', () => {
    const next = applyOrderTransitions(
      { orderStatus: 'CONFIRMED', paymentStatus: 'PENDING', fulfillmentStatus: 'PENDING' },
      { orderStatus: 'PROCESSING', fulfillmentStatus: 'ASSIGNED' },
    );
    expect(next.orderStatus).toBe('PROCESSING');
    expect(next.fulfillmentStatus).toBe('ASSIGNED');
  });
});

describe('promotion-engine', () => {
  it('rejects unknown promo codes', () => {
    const r = evaluatePromotion(DEFAULT_PROMOTIONS, 'INVALID', 10000);
    expect(r.valid).toBe(false);
  });

  it('applies fixed discount when min spend met', () => {
    const r = evaluatePromotion(DEFAULT_PROMOTIONS, 'WELCOME500', 5000, '2026-06-01');
    expect(r.valid).toBe(true);
    expect(r.discountTotal).toBe(500);
  });

  it('applies percent discount', () => {
    const r = evaluatePromotion(DEFAULT_PROMOTIONS, 'SUMMER10', 10000, '2026-06-01');
    expect(r.valid).toBe(true);
    expect(r.discountTotal).toBe(1000);
  });

  it('rejects below minimum spend', () => {
    const r = evaluatePromotion(DEFAULT_PROMOTIONS, 'WELCOME500', 1000);
    expect(r.valid).toBe(false);
  });
});
