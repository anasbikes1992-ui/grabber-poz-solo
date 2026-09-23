import { describe, it, expect } from 'vitest';
import { canTransitionRx, assertCanDispense, PRESCRIPTION_STATUSES } from '../src/lib/pharmacy/status';
import {
  canActivateContract,
  assertCanActivateContract,
  canReturnContract,
  assertCanReturnContract,
  canDisputeContract,
  statusesAfterActivate,
  statusesAfterReturn,
} from '../src/lib/rental/status';
import { assertCanPay, assertCanPost, nextStatusAfterPayment } from '../src/lib/finance/ap-rules';
import { cashAccountForApMethod } from '../src/lib/finance/post-ap-journal';
import { assertReconciliationBalances, clearedLinesSum } from '../src/lib/finance/bank-rules';
import { normalizeOemCode, validateYearRange } from '../src/lib/auto-parts/fitment';

describe('Wave E — pharmacy rx transitions', () => {
  it('exposes prescription statuses', () => {
    expect(PRESCRIPTION_STATUSES).toContain('DRAFT');
    expect(PRESCRIPTION_STATUSES).toContain('APPROVED');
    expect(PRESCRIPTION_STATUSES).toContain('DISPENSED');
  });

  it('allows draft → pending → approved → dispensed', () => {
    expect(canTransitionRx('DRAFT', 'PENDING_APPROVAL')).toBe(true);
    expect(canTransitionRx('PENDING_APPROVAL', 'APPROVED')).toBe(true);
    expect(canTransitionRx('APPROVED', 'DISPENSED')).toBe(true);
  });

  it('blocks illegal jumps', () => {
    expect(canTransitionRx('DRAFT', 'DISPENSED')).toBe(false);
    expect(canTransitionRx('DISPENSED', 'APPROVED')).toBe(false);
    expect(canTransitionRx('CANCELLED', 'APPROVED')).toBe(false);
  });

  it('assertCanDispense only allows APPROVED', () => {
    expect(() => assertCanDispense('APPROVED')).not.toThrow();
    expect(() => assertCanDispense('DRAFT')).toThrow(/APPROVED/);
    expect(() => assertCanDispense('PENDING_APPROVAL')).toThrow(/APPROVED/);
  });
});

describe('Wave E — rental activate/return rules', () => {
  it('activate requires DRAFT contract and AVAILABLE asset', () => {
    expect(canActivateContract('DRAFT', 'AVAILABLE')).toBe(true);
    expect(canActivateContract('DRAFT', 'RENTED')).toBe(false);
    expect(canActivateContract('ACTIVE', 'AVAILABLE')).toBe(false);
    expect(() => assertCanActivateContract('ACTIVE', 'AVAILABLE')).toThrow(/DRAFT/);
  });

  it('return and dispute only from ACTIVE', () => {
    expect(canReturnContract('ACTIVE')).toBe(true);
    expect(canReturnContract('DRAFT')).toBe(false);
    expect(canDisputeContract('ACTIVE')).toBe(true);
    expect(canDisputeContract('RETURNED')).toBe(false);
    expect(() => assertCanReturnContract('DRAFT')).toThrow(/ACTIVE/);
  });

  it('maps asset statuses after activate/return', () => {
    expect(statusesAfterActivate()).toEqual({ contract: 'ACTIVE', asset: 'RENTED' });
    expect(statusesAfterReturn()).toEqual({ contract: 'RETURNED', asset: 'AVAILABLE' });
  });
});

describe('Wave E — AP pay rules', () => {
  it('post only from DRAFT', () => {
    expect(() => assertCanPost('DRAFT')).not.toThrow();
    expect(() => assertCanPost('POSTED')).toThrow(/DRAFT/);
  });

  it('rejects overpay', () => {
    expect(() => assertCanPay('POSTED', 50, 100)).not.toThrow();
    expect(() => assertCanPay('PARTIAL', 100, 100)).not.toThrow();
    expect(() => assertCanPay('POSTED', 101, 100)).toThrow(/Overpay/);
    expect(() => assertCanPay('DRAFT', 10, 100)).toThrow(/POSTED or PARTIAL/);
    expect(() => assertCanPay('POSTED', 0, 100)).toThrow(/greater than 0/);
  });

  it('nextStatusAfterPayment', () => {
    expect(nextStatusAfterPayment(100, 40)).toBe('PARTIAL');
    expect(nextStatusAfterPayment(100, 100)).toBe('PAID');
    expect(nextStatusAfterPayment(100, 100.0000001)).toBe('PAID');
  });

  it('maps payment method to cash/bank CoA', () => {
    expect(cashAccountForApMethod('CASH')).toBe('1010');
    expect(cashAccountForApMethod('BANK')).toBe('1020');
    expect(cashAccountForApMethod(undefined)).toBe('1020');
  });
});

describe('Wave E — bank reconciliation balance', () => {
  it('sums cleared lines', () => {
    expect(
      clearedLinesSum([
        { amount: 100, cleared: true },
        { amount: -40, cleared: true },
        { amount: 10, cleared: false },
      ]),
    ).toBe(60);
  });

  it('asserts opening + cleared ≈ closing', () => {
    expect(() =>
      assertReconciliationBalances({ openingBalance: 1000, closingBalance: 1060, clearedSum: 60 }),
    ).not.toThrow();
    expect(() =>
      assertReconciliationBalances({ openingBalance: 1000, closingBalance: 1100, clearedSum: 60 }),
    ).toThrow(/out of balance/);
  });
});

describe('Wave E — OEM normalize', () => {
  it('normalizes oem codes', () => {
    expect(normalizeOemCode('  ab-12_34 ')).toBe('AB1234');
    expect(normalizeOemCode('oem 999')).toBe('OEM999');
  });

  it('validates year ranges', () => {
    expect(validateYearRange(2010, 2015)).toBe(true);
    expect(validateYearRange(2015, 2010)).toBe(false);
    expect(validateYearRange(null, null)).toBe(true);
  });
});
