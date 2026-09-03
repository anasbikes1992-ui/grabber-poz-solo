/**
 * Canonical money math for checkout (POS, storefront, PayHere, holds).
 * Catalog rows are authoritative; client unitPrice / unitCost / taxTotal are ignored.
 */

import { PricingEngine, type PricingResult } from './pricing-engine';
import { TaxEngine, type TaxRate } from './tax-engine';

export type CatalogProductRow = {
  id: string;
  name: string;
  sku: string;
  isActive: boolean;
  salePrice: string | number;
  costPrice: string | number;
  taxProfileId: string | null;
  reorderLevel?: number | null;
};

export type CatalogVariantRow = {
  id: string;
  productId: string;
  name: string;
  sku: string;
  active: boolean;
  salePrice: string | number | null;
  costPrice: string | number | null;
};

export type CatalogIntentLine = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export type ResolvedCatalogLine = {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  taxProfileId: string | null;
  reorderLevel: number;
};

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function numeric(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Variant sell/cost wins when set; otherwise product base. Never uses client-supplied money. */
export function resolveCatalogSell(
  product: CatalogProductRow,
  variant: CatalogVariantRow | null,
): { unitPrice: number; unitCost: number; name: string; sku: string; taxProfileId: string | null } {
  if (!product.isActive) {
    throw Object.assign(new Error(`Product not found or inactive: ${product.id}`), { status: 400 });
  }
  if (variant && variant.productId !== product.id) {
    throw Object.assign(new Error(`Variant ${variant.id} does not belong to product ${product.id}`), { status: 400 });
  }
  if (variant && !variant.active) {
    throw Object.assign(new Error(`Variant not found or inactive: ${variant.id}`), { status: 400 });
  }

  const variantPrice = variant ? numeric(variant.salePrice) : null;
  const variantCost = variant ? numeric(variant.costPrice) : null;
  const unitPrice = money(variantPrice ?? numeric(product.salePrice) ?? 0);
  const unitCost = money(variantCost ?? numeric(product.costPrice) ?? 0);
  const name = variant ? `${product.name} — ${variant.name}` : product.name;
  const sku = variant?.sku || product.sku;

  return {
    unitPrice,
    unitCost,
    name,
    sku,
    taxProfileId: product.taxProfileId,
  };
}

export function resolveCatalogLine(
  product: CatalogProductRow,
  variant: CatalogVariantRow | null,
  quantity: number,
): ResolvedCatalogLine {
  const qty = Math.floor(Number(quantity) || 0);
  if (!Number.isFinite(qty) || qty < 1) {
    throw Object.assign(new Error('Quantity must be at least 1'), { status: 400 });
  }
  const sell = resolveCatalogSell(product, variant);
  return {
    productId: product.id,
    variantId: variant?.id,
    name: sell.name,
    sku: sell.sku,
    quantity: qty,
    unitPrice: sell.unitPrice,
    unitCost: sell.unitCost,
    taxProfileId: sell.taxProfileId,
    reorderLevel: product.reorderLevel ?? 10,
  };
}

export function computeAuthoritativeCheckoutTotals(
  lines: ResolvedCatalogLine[],
  options: {
    discountTotal?: number;
    ratesRegistry: TaxRate[];
    defaultTaxProfileId?: string | null;
    isCustomerExempt?: boolean;
    transactionDate?: Date;
  },
): PricingResult {
  const discountTotal = Math.max(0, options.discountTotal || 0);
  const engine = new PricingEngine(new TaxEngine(options.ratesRegistry));
  return engine.calculateTotals(
    lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      name: l.name,
      unitPrice: l.unitPrice,
      unitCost: l.unitCost,
      quantity: l.quantity,
      taxProfileId: l.taxProfileId || options.defaultTaxProfileId || undefined,
    })),
    {
      cartDiscount: discountTotal,
      isCustomerExempt: options.isCustomerExempt,
      transactionDate: options.transactionDate,
      ratesRegistry: options.ratesRegistry,
    },
  );
}
