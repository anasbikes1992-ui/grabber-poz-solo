import { describe, expect, it } from 'vitest';
import {
  assertCanReceiveLine,
  assertReceivablePurchaseOrder,
  nextWeightedAverageCost,
  normalizeGrnQuantity,
} from '@/app/api/purchasing/grn/route';

describe('GRN invariants', () => {
  it('rejects non-positive and fractional receipt quantities', () => {
    expect(() => normalizeGrnQuantity(0)).toThrow(/positive integer/);
    expect(() => normalizeGrnQuantity(-1)).toThrow(/positive integer/);
    expect(() => normalizeGrnQuantity(1.5)).toThrow(/positive integer/);
    expect(normalizeGrnQuantity(3)).toBe(3);
  });

  it('rejects cancelled or already closed purchase orders', () => {
    expect(() => assertReceivablePurchaseOrder('CANCELLED')).toThrow(/cannot receive/);
    expect(() => assertReceivablePurchaseOrder('RECEIVED')).toThrow(/cannot receive/);
    expect(() => assertReceivablePurchaseOrder('APPROVED')).not.toThrow();
  });

  it('caps receipts to remaining ordered quantity', () => {
    const line = {
      id: 'line-1',
      productId: 'prod-1',
      orderedQty: 10,
      receivedQty: 7,
      unitCost: 25,
    };

    expect(assertCanReceiveLine(line, 'prod-1', 3)).toBe(line);
    expect(() => assertCanReceiveLine(line, 'prod-1', 4)).toThrow(/remaining quantity is 3/);
    expect(() => assertCanReceiveLine(undefined, 'prod-2', 1)).toThrow(/not on this purchase order/);
  });

  it('computes weighted average using total on-hand after receipt', () => {
    expect(nextWeightedAverageCost(10, 15, 5, 20)).toBeCloseTo(13.3333, 4);
  });
});
