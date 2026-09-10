/**
 * Multi-Currency & FX Exchange Helper
 * Allows tourist checkout and dual-currency display at POS and Storefront.
 */

export type CurrencyCode = 'LKR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export interface FxRateConfig {
  baseCurrency: 'LKR';
  rates: Record<CurrencyCode, number>; // How many LKR per 1 unit of foreign currency
  updatedAt: string;
}

export const DEFAULT_FX_RATES: FxRateConfig = {
  baseCurrency: 'LKR',
  rates: {
    LKR: 1,
    USD: 310,
    EUR: 335,
    GBP: 395,
    AED: 84.5,
  },
  updatedAt: new Date().toISOString(),
};

/** Converts LKR amount to target currency amount */
export function convertFromLkr(amountLkr: number, targetCurrency: CurrencyCode, rates = DEFAULT_FX_RATES.rates): number {
  if (targetCurrency === 'LKR') return amountLkr;
  const rate = rates[targetCurrency] || 1;
  return Number((amountLkr / rate).toFixed(2));
}

/** Converts foreign currency amount back to base LKR */
export function convertToLkr(amountForeign: number, sourceCurrency: CurrencyCode, rates = DEFAULT_FX_RATES.rates): number {
  if (sourceCurrency === 'LKR') return amountForeign;
  const rate = rates[sourceCurrency] || 1;
  return Number((amountForeign * rate).toFixed(2));
}

/** Formats an amount with proper currency symbol */
export function formatCurrency(amount: number, currency: CurrencyCode = 'LKR'): string {
  switch (currency) {
    case 'USD':
      return `$${amount.toFixed(2)}`;
    case 'EUR':
      return `€${amount.toFixed(2)}`;
    case 'GBP':
      return `£${amount.toFixed(2)}`;
    case 'AED':
      return `AED ${amount.toFixed(2)}`;
    case 'LKR':
    default:
      return `LKR ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
