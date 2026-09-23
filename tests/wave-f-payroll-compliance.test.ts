import { describe, it, expect } from 'vitest';
import {
  SL_STATUTORY,
  calculateStatutoryLine,
  aggregateStatutoryLines,
} from '../src/lib/hr/statutory';
import { estimateContractCharges } from '../src/lib/rental/service';
import { normalizeOemCode } from '../src/lib/auto-parts/fitment';

describe('Wave F — SL EPF/ETF statutory', () => {
  it('uses 8% / 12% / 3% rates', () => {
    expect(SL_STATUTORY.EPF_EMPLOYEE_RATE).toBe(0.08);
    expect(SL_STATUTORY.EPF_EMPLOYER_RATE).toBe(0.12);
    expect(SL_STATUTORY.ETF_EMPLOYER_RATE).toBe(0.03);
  });

  it('calculates line for 100_000 gross', () => {
    const r = calculateStatutoryLine({ grossAmount: 100_000 });
    expect(r.employeeEpf).toBe(8000);
    expect(r.employerEpf).toBe(12_000);
    expect(r.etf).toBe(3000);
    expect(r.paye).toBe(0);
    expect(r.net).toBe(92_000);
    expect(r.employerCost).toBe(115_000);
  });

  it('applies PAYE stub when eligible', () => {
    const r = calculateStatutoryLine({ grossAmount: 150_000, payeEligible: true });
    expect(r.paye).toBeGreaterThan(0);
    expect(r.net).toBe(r.gross - r.employeeEpf - r.paye);
  });

  it('respects eligibility flags', () => {
    const noEpf = calculateStatutoryLine({ grossAmount: 50_000, epfEligible: false });
    expect(noEpf.employeeEpf).toBe(0);
    expect(noEpf.employerEpf).toBe(0);
    expect(noEpf.etf).toBe(1500);
    expect(noEpf.net).toBe(50_000);

    const none = calculateStatutoryLine({
      grossAmount: 50_000,
      epfEligible: false,
      etfEligible: false,
    });
    expect(none.etf).toBe(0);
    expect(none.employerCost).toBe(50_000);
  });

  it('aggregates multiple lines', () => {
    const a = calculateStatutoryLine({ grossAmount: 100_000 });
    const b = calculateStatutoryLine({ grossAmount: 50_000 });
    const tot = aggregateStatutoryLines([a, b]);
    expect(tot.totalGross).toBe(150_000);
    expect(tot.totalEmployeeEpf).toBe(12_000);
    expect(tot.totalEmployerEpf).toBe(18_000);
    expect(tot.totalEtf).toBe(4500);
    expect(tot.totalNet).toBe(138_000);
  });
});

describe('Wave F — rental settlement helpers', () => {
  it('charges minimum 1 day', () => {
    const start = new Date('2026-09-18T10:00:00Z');
    const r = estimateContractCharges({
      startAt: start,
      endAt: new Date(start.getTime() + 60_000),
      rateAmount: 1000,
    });
    expect(r.billableDays).toBe(1);
    expect(r.rentalCharge).toBe(1000);
  });

  it('ceil days across multi-day rentals', () => {
    const r = estimateContractCharges({
      startAt: '2026-09-01T00:00:00Z',
      endAt: '2026-09-03T12:00:00Z',
      rateAmount: '2500',
    });
    expect(r.billableDays).toBe(3);
    expect(r.rentalCharge).toBe(7500);
  });
});

describe('Wave F — OEM normalize for search', () => {
  it('normalizes oem codes', () => {
    expect(normalizeOemCode('  abc-123  ')).toBe('ABC123');
  });
});
