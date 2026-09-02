import { TaxEngine, type TaxRate } from '@/lib/commerce/tax-engine';

/** Sri Lanka multi-tax profiles for reporting. */
export const SL_TAX_RATES: TaxRate[] = [
  {
    id: 'vat-18',
    taxProfileId: 'STANDARD_VAT',
    name: 'VAT 18%',
    ratePercentage: 18,
    effectiveFrom: new Date('2020-01-01'),
  },
  {
    id: 'sscl-2.5',
    taxProfileId: 'SSCL',
    name: 'SSCL 2.5%',
    ratePercentage: 2.5,
    effectiveFrom: new Date('2022-01-01'),
  },
  {
    id: 'zero',
    taxProfileId: 'ZERO_RATED',
    name: 'Zero Rated',
    ratePercentage: 0,
    effectiveFrom: new Date('2020-01-01'),
  },
  {
    id: 'exempt',
    taxProfileId: 'EXEMPT',
    name: 'Exempt',
    ratePercentage: 0,
    effectiveFrom: new Date('2020-01-01'),
  },
];

export type TaxLineInput = {
  netAmount: number;
  taxProfileId?: string | null;
  taxInclusive?: boolean;
};

export type TaxLineResult = {
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  breakdown: Array<{ name: string; rate: number; amount: number }>;
};

export function calculateMultiTaxLine(input: TaxLineInput): TaxLineResult {
  const engine = new TaxEngine(SL_TAX_RATES);
  const profileId = input.taxProfileId || 'STANDARD_VAT';
  const inclusive = input.taxInclusive ?? false;

  let net = input.netAmount;
  if (inclusive && profileId === 'STANDARD_VAT') {
    net = Math.round((input.netAmount / 1.18) * 100) / 100;
  }

  const vat = engine.calculateLineTax(net, { taxProfileId: profileId });
  let ssclAmount = 0;
  if (profileId === 'STANDARD_VAT') {
    const sscl = engine.calculateLineTax(net, { taxProfileId: 'SSCL', ratesRegistry: SL_TAX_RATES });
    ssclAmount = sscl.taxAmount;
  }

  const taxAmount = Math.round((vat.taxAmount + ssclAmount) * 100) / 100;
  const breakdown = [
    { name: vat.taxName, rate: vat.ratePercentage, amount: vat.taxAmount },
  ];
  if (ssclAmount > 0) breakdown.push({ name: 'SSCL 2.5%', rate: 2.5, amount: ssclAmount });

  return {
    netAmount: net,
    taxAmount,
    grossAmount: Math.round((net + taxAmount) * 100) / 100,
    breakdown,
  };
}

export type OrderTaxRow = {
  orderNumber: string;
  createdAt: Date | string;
  netSales: number;
  vatAmount: number;
  ssclAmount: number;
  exemptAmount: number;
};

export function aggregateMonthlyTaxLiability(rows: OrderTaxRow[], month: string) {
  const filtered = rows.filter((r) => {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return key === month;
  });

  const totals = filtered.reduce(
    (acc, r) => {
      acc.netSales += r.netSales;
      acc.vat += r.vatAmount;
      acc.sscl += r.ssclAmount;
      acc.exempt += r.exemptAmount;
      acc.orderCount += 1;
      return acc;
    },
    { netSales: 0, vat: 0, sscl: 0, exempt: 0, orderCount: 0 },
  );

  return {
    month,
    ...totals,
    totalLiability: Math.round((totals.vat + totals.sscl) * 100) / 100,
    rows: filtered,
  };
}

export function exportTaxCsv(summary: ReturnType<typeof aggregateMonthlyTaxLiability>) {
  const header = 'orderNumber,netSales,vat,sscl,exempt,createdAt\n';
  const body = summary.rows
    .map(
      (r) =>
        `${r.orderNumber},${r.netSales.toFixed(2)},${r.vatAmount.toFixed(2)},${r.ssclAmount.toFixed(2)},${r.exemptAmount.toFixed(2)},${new Date(r.createdAt).toISOString()}`,
    )
    .join('\n');
  return header + body;
}
