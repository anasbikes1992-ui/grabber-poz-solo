import { describe, expect, it } from 'vitest';
import { buildInstallmentSchedule, computeHirePurchaseArrears } from '../src/lib/hire-purchase/arrears';

describe('hire purchase arrears', () => {
  it('flags overdue when next due date is in the past', () => {
    const past = new Date(Date.now() - 45 * 86_400_000);
    const result = computeHirePurchaseArrears({
      status: 'ACTIVE',
      nextDueDate: past,
      monthlyEmi: 5000,
      paidMonths: 2,
      totalMonths: 12,
    });
    expect(result.overdue).toBe(true);
    expect(result.missedInstallments).toBeGreaterThanOrEqual(1);
    expect(result.arrearsAmount).toBeGreaterThanOrEqual(5000);
  });

  it('returns zero arrears for settled contracts', () => {
    const result = computeHirePurchaseArrears({
      status: 'SETTLED',
      nextDueDate: new Date(Date.now() - 90 * 86_400_000),
      monthlyEmi: 5000,
      paidMonths: 12,
      totalMonths: 12,
    });
    expect(result.overdue).toBe(false);
    expect(result.arrearsAmount).toBe(0);
  });

  it('builds installment schedule with paid flags', () => {
    const schedule = buildInstallmentSchedule({
      totalMonths: 6,
      paidMonths: 2,
      monthlyEmi: 10000,
      nextDueDate: new Date('2026-03-01'),
    });
    expect(schedule).toHaveLength(6);
    expect(schedule.filter((s) => s.paid)).toHaveLength(2);
    expect(schedule[2].paid).toBe(false);
  });
});
