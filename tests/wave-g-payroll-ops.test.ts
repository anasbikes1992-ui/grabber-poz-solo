import { describe, it, expect } from 'vitest';
import { calculatePayeStub, calculateStatutoryLine, aggregateStatutoryLines } from '../src/lib/hr/statutory';
import { estimateContractCharges } from '../src/lib/rental/service';
import { cashAccountForApMethod } from '../src/lib/finance/post-ap-journal';

describe('Wave G — PAYE stub', () => {
  it('zero under 100k', () => {
    expect(calculatePayeStub(80_000)).toBe(0);
  });

  it('taxes slice above 100k at 6%', () => {
    // 141667 - 100000 = 41667 * 0.06
    expect(calculatePayeStub(141_667)).toBe(2500.02);
  });

  it('aggregates paye totals', () => {
    const a = calculateStatutoryLine({ grossAmount: 150_000, payeEligible: true });
    const b = calculateStatutoryLine({ grossAmount: 50_000, payeEligible: false });
    const tot = aggregateStatutoryLines([a, b]);
    expect(tot.totalPaye).toBe(a.paye);
    expect(tot.totalGross).toBe(200_000);
  });
});

describe('Wave G — rental settlement still sound', () => {
  it('settles multi-day charge', () => {
    const r = estimateContractCharges({
      startAt: '2026-09-01T00:00:00Z',
      endAt: '2026-09-04T00:00:00Z',
      rateAmount: 1000,
    });
    expect(r.billableDays).toBe(3);
    expect(r.rentalCharge).toBe(3000);
  });
});

describe('Wave G — cash account helper still bank-default', () => {
  it('maps CASH vs BANK', () => {
    expect(cashAccountForApMethod('CASH')).toBe('1010');
    expect(cashAccountForApMethod('BANK')).toBe('1020');
  });
});
