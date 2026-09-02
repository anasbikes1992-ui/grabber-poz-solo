import { describe, it, expect } from 'vitest';
import {
  orderProgressSteps,
  phoneLast4Matches,
  repairTimelineStatus,
  verifyOrderAccess,
} from '../src/lib/tracking/order-tracker';
import { abandonedCartMessage, buildRecoveryUrl } from '../src/lib/commerce/abandoned-checkout';
import { computeVariance } from '../src/lib/inventory/stock-take';
import { buildMatrixPoLines, matrixPoSummary } from '../src/lib/purchasing/matrix-po';
import { calculateMultiTaxLine, aggregateMonthlyTaxLiability } from '../src/lib/reports/tax-liability';
import { appraiseTradeIn } from '../src/lib/trade-in/trade-in-service';

describe('order tracker', () => {
  it('phoneLast4Matches normalizes digits', () => {
    expect(phoneLast4Matches('94771234567', '4567')).toBe(true);
    expect(phoneLast4Matches('0771234567', '4567')).toBe(true);
  });

  it('verifyOrderAccess accepts token or phone last 4', () => {
    expect(verifyOrderAccess({ trackingToken: 'abc' }, '0771234567', { token: 'abc' })).toBe(true);
    expect(verifyOrderAccess({}, '0771234567', { phoneLast4: '4567' })).toBe(true);
    expect(verifyOrderAccess({}, '0771234567', { phoneLast4: '0000' })).toBe(false);
  });

  it('orderProgressSteps maps IN_TRANSIT to delivery step', () => {
    const steps = orderProgressSteps('CONFIRMED', 'IN_TRANSIT');
    expect(steps.some((s) => s.step === 'OUT_FOR_DELIVERY' && s.current)).toBe(true);
  });

  it('repairTimelineStatus includes intake through pickup', () => {
    const tl = repairTimelineStatus('IN_PROGRESS');
    expect(tl.find((s) => s.step === 'INTAKE')?.done).toBe(true);
  });
});

describe('abandoned checkout', () => {
  it('buildRecoveryUrl includes token', () => {
    expect(buildRecoveryUrl('tok123')).toContain('recover=tok123');
  });

  it('abandonedCartMessage includes recovery link', () => {
    const msg = abandonedCartMessage(
      [{ productId: 'p1', name: 'Phone', unitPrice: 100, qty: 1 }],
      'https://shop/checkout?recover=x',
      'SAVE5',
    );
    expect(msg).toContain('https://shop/checkout?recover=x');
    expect(msg).toContain('SAVE5');
  });
});

describe('stock take', () => {
  it('computeVariance is physical minus system', () => {
    expect(computeVariance(12, 10)).toBe(2);
    expect(computeVariance(8, 10)).toBe(-2);
  });
});

describe('matrix PO', () => {
  it('buildMatrixPoLines skips zero qty cells', () => {
    const lines = buildMatrixPoLines(['S', 'M'], ['Red'], { 'S::Red': 5, 'M::Red': 0 }, 100);
    expect(lines).toHaveLength(1);
    expect(matrixPoSummary(lines).totalQty).toBe(5);
  });
});

describe('tax liability', () => {
  it('calculateMultiTaxLine applies VAT and SSCL', () => {
    const r = calculateMultiTaxLine({ netAmount: 1000, taxProfileId: 'STANDARD_VAT' });
    expect(r.taxAmount).toBeGreaterThan(180);
    expect(r.grossAmount).toBeGreaterThan(1000);
  });

  it('aggregateMonthlyTaxLiability filters by month', () => {
    const summary = aggregateMonthlyTaxLiability(
      [
        {
          orderNumber: 'O1',
          createdAt: '2026-03-15',
          netSales: 100,
          vatAmount: 18,
          ssclAmount: 2.5,
          exemptAmount: 0,
        },
      ],
      '2026-03',
    );
    expect(summary.orderCount).toBe(1);
    expect(summary.totalLiability).toBe(20.5);
  });
});

describe('trade-in', () => {
  it('appraiseTradeIn scales by grade', () => {
    expect(appraiseTradeIn(100000, 'A')).toBe(65000);
    expect(appraiseTradeIn(100000, 'D')).toBe(20000);
  });
});
