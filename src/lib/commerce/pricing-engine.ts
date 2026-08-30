/**
 * GRABBER BUSINESS OS — PRICING & TOTALS ENGINE
 * Deterministic Line Item, Discount, Tax & Grand Total Computation
 */

import { TaxEngine, defaultTaxEngine, TaxRate } from './tax-engine';

export interface CartLineInput {
  productId: string;
  variantId?: string;
  name: string;
  unitPrice: number;
  unitCost?: number;
  quantity: number;
  taxProfileId?: string | null;
  lineDiscount?: number; // Direct discount on this line
}

export interface PricingOptions {
  cartDiscount?: number; // Overall cart-level discount
  isCustomerExempt?: boolean;
  transactionDate?: Date;
  ratesRegistry?: TaxRate[];
  taxEngine?: TaxEngine;
}

export interface CalculatedLine {
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  grossAmount: number;
  lineDiscount: number;
  allocatedCartDiscount: number;
  taxableAmount: number;
  taxRatePercentage: number;
  taxName: string;
  taxAmount: number;
  netLineTotal: number;
}

export interface PricingResult {
  lines: CalculatedLine[];
  subtotal: number;
  lineDiscountTotal: number;
  cartDiscountTotal: number;
  totalDiscount: number;
  taxableTotal: number;
  taxTotal: number;
  taxBreakdown: Record<string, { taxName: string; ratePercentage: number; taxableAmount: number; taxAmount: number }>;
  grandTotal: number;
}

export class PricingEngine {
  private taxEngine: TaxEngine;

  constructor(taxEngine: TaxEngine = defaultTaxEngine) {
    this.taxEngine = taxEngine;
  }

  public calculateTotals(items: CartLineInput[], options: PricingOptions = {}): PricingResult {
    const taxEngineToUse = options.taxEngine || this.taxEngine;
    const date = options.transactionDate || new Date();
    const cartDiscount = Math.max(0, options.cartDiscount || 0);

    // 1. First pass: Gross amounts & line discounts
    let rawSubtotal = 0;
    let rawLineDiscountTotal = 0;

    const preliminaryLines = items.map((item) => {
      const quantity = Math.max(1, item.quantity);
      const unitPrice = Math.max(0, item.unitPrice);
      const unitCost = Math.max(0, item.unitCost || 0);
      const grossAmount = Math.round(unitPrice * quantity * 100) / 100;
      const lineDiscount = Math.min(grossAmount, Math.max(0, item.lineDiscount || 0));

      rawSubtotal += grossAmount;
      rawLineDiscountTotal += lineDiscount;

      return {
        ...item,
        quantity,
        unitPrice,
        unitCost,
        grossAmount,
        lineDiscount,
      };
    });

    const netAfterLineDiscount = Math.max(0, rawSubtotal - rawLineDiscountTotal);
    const applicableCartDiscount = Math.min(netAfterLineDiscount, cartDiscount);

    // 2. Second pass: Allocate cart discount proportionally and calculate taxes
    const taxBreakdown: Record<string, { taxName: string; ratePercentage: number; taxableAmount: number; taxAmount: number }> = {};
    let totalTax = 0;
    let grandTotalAccumulator = 0;

    const calculatedLines: CalculatedLine[] = preliminaryLines.map((line) => {
      const lineNetBeforeCartDiscount = line.grossAmount - line.lineDiscount;
      let allocatedCartDiscount = 0;

      if (netAfterLineDiscount > 0 && applicableCartDiscount > 0) {
        allocatedCartDiscount = Math.round((lineNetBeforeCartDiscount / netAfterLineDiscount) * applicableCartDiscount * 100) / 100;
      }

      const taxableAmount = Math.max(0, lineNetBeforeCartDiscount - allocatedCartDiscount);

      const taxCalc = taxEngineToUse.calculateLineTax(taxableAmount, {
        taxProfileId: line.taxProfileId,
        transactionDate: date,
        isCustomerExempt: options.isCustomerExempt,
        ratesRegistry: options.ratesRegistry,
      });

      const lineTotal = Math.round((taxableAmount + taxCalc.taxAmount) * 100) / 100;
      totalTax += taxCalc.taxAmount;
      grandTotalAccumulator += lineTotal;

      // Group tax breakdown
      const breakdownKey = `${taxCalc.taxName}_${taxCalc.ratePercentage}`;
      if (!taxBreakdown[breakdownKey]) {
        taxBreakdown[breakdownKey] = {
          taxName: taxCalc.taxName,
          ratePercentage: taxCalc.ratePercentage,
          taxableAmount: 0,
          taxAmount: 0,
        };
      }
      taxBreakdown[breakdownKey].taxableAmount = Math.round((taxBreakdown[breakdownKey].taxableAmount + taxableAmount) * 100) / 100;
      taxBreakdown[breakdownKey].taxAmount = Math.round((taxBreakdown[breakdownKey].taxAmount + taxCalc.taxAmount) * 100) / 100;

      return {
        productId: line.productId,
        variantId: line.variantId,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        unitCost: line.unitCost,
        grossAmount: line.grossAmount,
        lineDiscount: line.lineDiscount,
        allocatedCartDiscount,
        taxableAmount,
        taxRatePercentage: taxCalc.ratePercentage,
        taxName: taxCalc.taxName,
        taxAmount: taxCalc.taxAmount,
        netLineTotal: lineTotal,
      };
    });

    const subtotalRounded = Math.round(rawSubtotal * 100) / 100;
    const totalDiscountRounded = Math.round((rawLineDiscountTotal + applicableCartDiscount) * 100) / 100;
    const totalTaxRounded = Math.round(totalTax * 100) / 100;
    const grandTotalRounded = Math.round(grandTotalAccumulator * 100) / 100;
    const taxableTotalRounded = Math.round((subtotalRounded - totalDiscountRounded) * 100) / 100;

    return {
      lines: calculatedLines,
      subtotal: subtotalRounded,
      lineDiscountTotal: Math.round(rawLineDiscountTotal * 100) / 100,
      cartDiscountTotal: applicableCartDiscount,
      totalDiscount: totalDiscountRounded,
      taxableTotal: taxableTotalRounded,
      taxTotal: totalTaxRounded,
      taxBreakdown,
      grandTotal: grandTotalRounded,
    };
  }
}

export const defaultPricingEngine = new PricingEngine();
