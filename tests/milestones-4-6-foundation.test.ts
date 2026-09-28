import { describe, expect, it } from 'vitest';
import { normalizeBankDirection, scorePaymentMatch } from '@/lib/finance/bank-matching';
import { calculateWmapeAndBias, costVarianceSeverity } from '@/lib/erp/control-loop';

describe('milestones 4-6 foundation rules', () => {
  it('classifies bank feed line direction by signed amount', () => {
    expect(normalizeBankDirection(1000)).toBe('CREDIT');
    expect(normalizeBankDirection(-1000)).toBe('DEBIT');
  });

  it('scores payment matches by exact amount and provider reference', () => {
    const strong = scorePaymentMatch(
      { amount: 2500, bankReference: 'PAY-123' },
      { id: 'pay-1', amount: '2500.00', providerRef: 'PAY-123' },
    );
    const amountOnly = scorePaymentMatch(
      { amount: 2500, bankReference: 'BANK-X' },
      { id: 'pay-2', amount: '2500.00', providerRef: 'PAY-999' },
    );

    expect(strong.confidence).toBe(1);
    expect(strong.rule).toBe('REF_AND_AMOUNT');
    expect(amountOnly.confidence).toBe(0.7);
    expect(amountOnly.rule).toBe('AMOUNT_ONLY');
  });

  it('calculates WMAPE and forecast bias for demand planning evidence', () => {
    const result = calculateWmapeAndBias([
      { forecastQty: 12, actualQty: 10 },
      { forecastQty: 8, actualQty: 10 },
    ]);

    expect(result.wmape).toBe(0.2);
    expect(result.bias).toBe(0);
  });

  it('classifies supplier cost variance severity', () => {
    expect(costVarianceSeverity(100, 104).severity).toBe('INFO');
    expect(costVarianceSeverity(100, 108).severity).toBe('LOW');
    expect(costVarianceSeverity(100, 115).severity).toBe('MEDIUM');
    expect(costVarianceSeverity(100, 125).severity).toBe('HIGH');
  });
});
