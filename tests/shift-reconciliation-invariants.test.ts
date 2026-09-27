import { describe, expect, it } from 'vitest';
import {
  assertPositiveCashMovementAmount,
  expectedCashForShift,
  summarizeCapturedShiftPayments,
} from '@/lib/shifts/reconciliation';

describe('shift reconciliation invariants', () => {
  it('rejects zero and negative cash drawer movements', () => {
    expect(() => assertPositiveCashMovementAmount(0)).toThrow(/greater than 0/);
    expect(() => assertPositiveCashMovementAmount(-50)).toThrow(/greater than 0/);
    expect(assertPositiveCashMovementAmount(50)).toBe(50);
  });

  it('counts only captured tender and excludes pending COD from cash', () => {
    const summary = summarizeCapturedShiftPayments([
      { method: 'CASH', amount: 1000, status: 'CAPTURED' },
      { method: 'COD', amount: 700, status: 'PENDING' },
      { method: 'COD', amount: 300, status: 'SUCCESS' },
      { method: 'CARD', amount: 250, status: 'FAILED' },
    ]);

    expect(summary.cashSales).toBe(1300);
    expect(summary.cardSales).toBe(0);
  });

  it('subtracts cash drops and cash refunds from expected drawer cash', () => {
    expect(
      expectedCashForShift({
        openingFloat: 500,
        cashSales: 2000,
        cashPaidIn: 100,
        cashPaidOut: 400,
        cashRefunds: 250,
      }),
    ).toBe(1950);
  });
});
