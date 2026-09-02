/** MobileRepair electronics variant attributes (stored in product_variants.attributes_json). */

export const ELECTRONICS_STORAGE = ['64GB', '128GB', '256GB', '512GB', '1TB'] as const;
export type ElectronicsStorage = (typeof ELECTRONICS_STORAGE)[number];

export const ELECTRONICS_CONDITION = [
  'SEALED_NEW',
  'PRE_OWNED_GRADE_A',
  'PRE_OWNED_GRADE_B',
  'REFURBISHED',
] as const;
export type ElectronicsCondition = (typeof ELECTRONICS_CONDITION)[number];

export const ELECTRONICS_WARRANTY = [
  'TRCSL_COMPANY_1Y',
  'STORE_WARRANTY_6M',
  'STORE_WARRANTY_1M',
  'NO_WARRANTY',
] as const;
export type ElectronicsWarrantyType = (typeof ELECTRONICS_WARRANTY)[number];

export type ElectronicsVariantAttrs = {
  storage?: ElectronicsStorage | string;
  color?: string;
  condition?: ElectronicsCondition | string;
  warrantyType?: ElectronicsWarrantyType | string;
};

export type ElectronicsVariant = {
  id: string;
  productId: string;
  sku: string;
  storage: string;
  color: string;
  condition: ElectronicsCondition | string;
  warrantyType: ElectronicsWarrantyType | string;
  regularPrice: number;
  salePrice: number;
  stockOnHand: number;
};

export const CONDITION_LABELS: Record<string, string> = {
  SEALED_NEW: 'Sealed Brand New',
  PRE_OWNED_GRADE_A: 'Pre-Owned Grade A — Minor Scratches',
  PRE_OWNED_GRADE_B: 'Pre-Owned Grade B — Visible Wear',
  REFURBISHED: 'Certified Refurbished',
};

export const WARRANTY_LABELS: Record<string, string> = {
  TRCSL_COMPANY_1Y: 'TRCSL Official Company Warranty (1 Year)',
  STORE_WARRANTY_6M: '6 Months Store Warranty Included',
  STORE_WARRANTY_1M: '1 Month Store Warranty',
  NO_WARRANTY: 'No Warranty',
};
