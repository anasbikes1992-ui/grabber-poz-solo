/**
 * GRABBER BUSINESS OS — TAX CONFIGURATION ENGINE
 * Dynamic, Effective-Dated Tax Rate Calculation
 */

export interface TaxProfile {
  id: string;
  code: 'STANDARD_VAT' | 'ZERO_RATED' | 'EXEMPT' | 'NON_TAXABLE' | 'CUSTOM';
  name: string;
  isActive: boolean;
}

export interface TaxRate {
  id: string;
  taxProfileId: string;
  name: string; // e.g. "VAT 18%", "NBT 2%", "Custom Tax"
  ratePercentage: number; // e.g. 18.0
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

export interface TaxCalculationContext {
  taxProfileId?: string | null;
  transactionDate?: Date;
  isCustomerExempt?: boolean;
  ratesRegistry?: TaxRate[];
}

export interface CalculatedTax {
  taxProfileId?: string;
  taxName: string;
  ratePercentage: number;
  taxableAmount: number;
  taxAmount: number;
}

export class TaxEngine {
  private rates: TaxRate[] = [];

  constructor(initialRates: TaxRate[] = []) {
    this.rates = initialRates;
  }

  public registerRate(rate: TaxRate) {
    this.rates.push(rate);
  }

  public setRates(rates: TaxRate[]) {
    this.rates = rates;
  }

  /**
   * Resolves the active tax rate for a given profile and date.
   */
  public resolveActiveRate(taxProfileId?: string | null, date: Date = new Date()): TaxRate | null {
    if (!taxProfileId) return null;

    const matched = this.rates.filter((r) => {
      if (r.taxProfileId !== taxProfileId) return false;
      const from = new Date(r.effectiveFrom).getTime();
      const to = r.effectiveTo ? new Date(r.effectiveTo).getTime() : Infinity;
      const target = date.getTime();
      return target >= from && target <= to;
    });

    if (matched.length === 0) return null;

    // Return the latest effective rate
    return matched.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0];
  }

  /**
   * Calculates tax for a line item based on net amount and context.
   */
  public calculateLineTax(taxableAmount: number, context: TaxCalculationContext): CalculatedTax {
    if (context.isCustomerExempt || !context.taxProfileId) {
      return {
        taxProfileId: context.taxProfileId || undefined,
        taxName: 'Exempt',
        ratePercentage: 0,
        taxableAmount,
        taxAmount: 0,
      };
    }

    const date = context.transactionDate || new Date();
    const activeRate = context.ratesRegistry
      ? new TaxEngine(context.ratesRegistry).resolveActiveRate(context.taxProfileId, date)
      : this.resolveActiveRate(context.taxProfileId, date);

    if (!activeRate || activeRate.ratePercentage <= 0) {
      return {
        taxProfileId: context.taxProfileId,
        taxName: activeRate?.name || 'Zero-Rated',
        ratePercentage: 0,
        taxableAmount,
        taxAmount: 0,
      };
    }

    const rawTax = (taxableAmount * activeRate.ratePercentage) / 100;
    const roundedTax = Math.round(rawTax * 100) / 100;

    return {
      taxProfileId: context.taxProfileId,
      taxName: activeRate.name,
      ratePercentage: activeRate.ratePercentage,
      taxableAmount,
      taxAmount: roundedTax,
    };
  }
}

// Global default TaxEngine instance
export const defaultTaxEngine = new TaxEngine();
