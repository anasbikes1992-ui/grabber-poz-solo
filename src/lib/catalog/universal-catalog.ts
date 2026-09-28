export type UniversalStockStatus = 'unknown' | 'provided' | 'invalid' | 'flagOnly';

export type UniversalCatalogRowType = 'simple' | 'variable' | 'variation' | 'service';

export type UniversalStagedCatalogRow = {
  rowIndex: number;
  sourceId: string;
  sourceHash: string;
  type: UniversalCatalogRowType;
  title: string;
  rawSku: string;
  internalSku: string;
  parentRaw: string | null;
  barcode: string | null;
  costPrice: number | null;
  wholesalePrice: number | null;
  regularPrice: number | null;
  salePrice: number | null;
  currentPrice: number | null;
  categories: string[][];
  tags: string[];
  images: string[];
  brandName: string | null;
  supplierName: string | null;
  expiryDate: string | null;
  warrantyMonths: number | null;
  maxDiscountAmount: number | null;
  singleDiscount: boolean | null;
  discountPercent: number | null;
  dimensions: {
    weightValue: number | null;
    weightUnit: string | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
  };
  description: string | null;
  shortDescription: string | null;
  attributes: Record<string, string>;
  publishedInSource: boolean;
  itemType: 'PHYSICAL' | 'SERVICE' | 'SERIALIZED' | 'PART' | 'RAW_INGREDIENT' | 'PREPARED_FOOD' | 'CUSTOM_QUOTE';
  reviewRequired: boolean;
  raw: Record<string, string>;
  stock: {
    status: UniversalStockStatus;
    quantity: number | null;
    inStockFlag: boolean | null;
  };
  warnings: string[];
};

export type UniversalStagedCatalogFamily = {
  parent: UniversalStagedCatalogRow;
  children: UniversalStagedCatalogRow[];
};

export type UniversalCatalogStagingSummary = {
  totalRows: number;
  variableParents: number;
  simpleProducts: number;
  services: number;
  childVariations: number;
  orphanChildren: number;
  rowsWithWarnings: number;
  rowsReviewRequired: number;
  sourceFileHash: string;
};

export type UniversalCatalogStagingResult = {
  sourceSystem: 'woocommerce' | 'shopify' | 'standard_csv';
  rows: UniversalStagedCatalogRow[];
  families: UniversalStagedCatalogFamily[];
  simpleProducts: UniversalStagedCatalogRow[];
  orphanChildren: UniversalStagedCatalogRow[];
  summary: UniversalCatalogStagingSummary;
};

export function emptyUniversalStagingResult(
  sourceSystem: UniversalCatalogStagingResult['sourceSystem'],
  sourceFileHash: string,
): UniversalCatalogStagingResult {
  return {
    sourceSystem,
    rows: [],
    families: [],
    simpleProducts: [],
    orphanChildren: [],
    summary: {
      totalRows: 0,
      variableParents: 0,
      simpleProducts: 0,
      services: 0,
      childVariations: 0,
      orphanChildren: 0,
      rowsWithWarnings: 0,
      rowsReviewRequired: 0,
      sourceFileHash,
    },
  };
}
