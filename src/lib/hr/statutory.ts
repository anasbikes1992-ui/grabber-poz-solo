/**
 * Sri Lanka statutory payroll rates (EPF / ETF / PAYE stub).
 * Source of truth for calc — not a substitute for EPF Board / IRD certification.
 */
export const SL_STATUTORY = {
  /** Employee EPF contribution */
  EPF_EMPLOYEE_RATE: 0.08,
  /** Employer EPF contribution */
  EPF_EMPLOYER_RATE: 0.12,
  /** Employer ETF contribution */
  ETF_EMPLOYER_RATE: 0.03,
} as const;

/**
 * Simplified monthly APIT/PAYE placeholder brackets (LKR).
 * Replace with current IRD tables before production tax filing.
 */
export const SL_PAYE_BRACKETS_STUB: Array<{ upTo: number; rate: number }> = [
  { upTo: 100_000, rate: 0 },
  { upTo: 141_667, rate: 0.06 },
  { upTo: 183_333, rate: 0.12 },
  { upTo: 225_000, rate: 0.18 },
  { upTo: 266_667, rate: 0.24 },
  { upTo: Infinity, rate: 0.3 },
];

export type StatutoryLineInput = {
  grossAmount: number;
  epfEligible?: boolean;
  etfEligible?: boolean;
  payeEligible?: boolean;
};

export type StatutoryLineResult = {
  gross: number;
  employeeEpf: number;
  employerEpf: number;
  etf: number;
  paye: number;
  net: number;
  employerCost: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Progressive PAYE stub — opt-in via payeEligible. */
export function calculatePayeStub(grossAmount: number): number {
  const gross = round2(Math.max(0, Number(grossAmount) || 0));
  let remaining = gross;
  let tax = 0;
  let prev = 0;
  for (const b of SL_PAYE_BRACKETS_STUB) {
    const span = Math.min(remaining, b.upTo - prev);
    if (span <= 0) break;
    tax += span * b.rate;
    remaining -= span;
    prev = b.upTo;
    if (remaining <= 0) break;
  }
  return round2(tax);
}

export function calculateStatutoryLine(input: StatutoryLineInput): StatutoryLineResult {
  const gross = round2(Math.max(0, Number(input.grossAmount) || 0));
  const epfOn = input.epfEligible !== false;
  const etfOn = input.etfEligible !== false;
  const payeOn = Boolean(input.payeEligible);

  const employeeEpf = epfOn ? round2(gross * SL_STATUTORY.EPF_EMPLOYEE_RATE) : 0;
  const employerEpf = epfOn ? round2(gross * SL_STATUTORY.EPF_EMPLOYER_RATE) : 0;
  const etf = etfOn ? round2(gross * SL_STATUTORY.ETF_EMPLOYER_RATE) : 0;
  const paye = payeOn ? calculatePayeStub(gross) : 0;
  const net = round2(gross - employeeEpf - paye);
  const employerCost = round2(gross + employerEpf + etf);

  return { gross, employeeEpf, employerEpf, etf, paye, net, employerCost };
}

export function aggregateStatutoryLines(lines: StatutoryLineResult[]) {
  return lines.reduce(
    (acc, l) => ({
      totalGross: round2(acc.totalGross + l.gross),
      totalEmployeeEpf: round2(acc.totalEmployeeEpf + l.employeeEpf),
      totalEmployerEpf: round2(acc.totalEmployerEpf + l.employerEpf),
      totalEtf: round2(acc.totalEtf + l.etf),
      totalPaye: round2(acc.totalPaye + l.paye),
      totalNet: round2(acc.totalNet + l.net),
      totalEmployerCost: round2(acc.totalEmployerCost + l.employerCost),
    }),
    {
      totalGross: 0,
      totalEmployeeEpf: 0,
      totalEmployerEpf: 0,
      totalEtf: 0,
      totalPaye: 0,
      totalNet: 0,
      totalEmployerCost: 0,
    },
  );
}
