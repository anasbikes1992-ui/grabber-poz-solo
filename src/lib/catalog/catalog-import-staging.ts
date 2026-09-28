import { createHash } from 'crypto';
import { parseProductCsv } from './product-import';
import { stageWooCommerceCatalog } from './woocommerce-staging';
import type {
  UniversalCatalogStagingResult,
  UniversalStagedCatalogRow,
} from './universal-catalog';

export type CatalogImportSourceSystem = 'woocommerce' | 'shopify' | 'standard_csv';

export type CatalogStagingResult = UniversalCatalogStagingResult & {
  sourceSystem: CatalogImportSourceSystem;
};

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function genericSourceId(row: { sku: string; name: string }, rowIndex: number): string {
  return row.sku || `${rowIndex}:${row.name}`;
}

function stageGenericProductCsv(
  csv: string,
  sourceSystem: Exclude<CatalogImportSourceSystem, 'woocommerce'>,
): CatalogStagingResult {
  const parsedRows = parseProductCsv(csv);
  const rows: UniversalStagedCatalogRow[] = parsedRows.map((row, index) => {
    const sourceId = genericSourceId(row, index + 1);
    const warnings: string[] = [];
    if (!row.sku) warnings.push('Missing source SKU; deterministic source row identity generated.');
    if (!row.imageUrl) warnings.push('No valid source image URL.');
    if (row.initialStock < 0) warnings.push('Negative stock quarantined; do not create stock ledger movement.');
    if (row.initialStock > 0) warnings.push('Stock quantity staged for review; physical count approval required.');
    if (row.raw && Object.values(row.raw).some((value) => /^0000-00-\d{2}$/.test(value) || value === '0000-00-00')) {
      warnings.push('Invalid expiry date ignored.');
    }

    const attributes: Record<string, string> = {};
    if (row.variantName) attributes.Variant = row.variantName;

    return {
      rowIndex: index + 1,
      sourceId,
      sourceHash: fingerprint(JSON.stringify(row)),
      type: 'simple',
      title: row.name,
      rawSku: row.sku,
      internalSku: row.sku || `${sourceSystem.toUpperCase()}-${index + 1}`,
      parentRaw: null,
      barcode: row.barcode || null,
      costPrice: row.costPrice,
      wholesalePrice: row.wholesalePrice ?? null,
      regularPrice: row.salePrice || null,
      salePrice: null,
      currentPrice: row.salePrice || null,
      categories: row.category ? [[row.category]] : [],
      tags: [],
      images: row.images?.length ? row.images : row.imageUrl ? [row.imageUrl] : [],
      brandName: row.brandName || null,
      supplierName: row.supplierName || null,
      expiryDate: row.expiryDate || null,
      warrantyMonths: row.warrantyMonths ?? null,
      maxDiscountAmount: row.maxDiscountAmount ?? null,
      singleDiscount: row.singleDiscount ?? null,
      discountPercent: row.discountPercent ?? null,
      dimensions: {
        weightValue: null,
        weightUnit: null,
        lengthCm: null,
        widthCm: null,
        heightCm: null,
      },
      description: row.description || null,
      shortDescription: null,
      attributes,
      publishedInSource: row.isActive ?? true,
      itemType: 'PHYSICAL',
      reviewRequired: row.initialStock !== 0,
      raw: row.raw || {},
      stock:
        row.initialStock < 0
          ? { status: 'invalid', quantity: row.initialStock, inStockFlag: null }
          : row.initialStock > 0
            ? { status: 'provided', quantity: row.initialStock, inStockFlag: null }
            : { status: 'unknown', quantity: null, inStockFlag: null },
      warnings,
    };
  });

  return {
    sourceSystem,
    rows,
    families: [],
    simpleProducts: rows.filter((row) => row.type === 'simple'),
    orphanChildren: [],
    summary: {
      totalRows: rows.length,
      variableParents: 0,
      simpleProducts: rows.length,
      services: rows.filter((row) => row.type === 'service').length,
      childVariations: 0,
      orphanChildren: 0,
      rowsWithWarnings: rows.filter((row) => row.warnings.length > 0).length,
      rowsReviewRequired: rows.filter((row) => row.reviewRequired).length,
      sourceFileHash: fingerprint(csv),
    },
  };
}

export function stageCatalogImport(
  csv: string,
  sourceSystem: CatalogImportSourceSystem,
): CatalogStagingResult {
  if (sourceSystem === 'woocommerce') {
    return { ...stageWooCommerceCatalog(csv), sourceSystem };
  }
  return stageGenericProductCsv(csv, sourceSystem);
}

export function parseCatalogImportSourceSystem(value: string): CatalogImportSourceSystem {
  const normalized = value.trim().toLowerCase().replace(/[-\s]/g, '_');
  if (normalized === 'woocommerce' || normalized === 'woo') return 'woocommerce';
  if (normalized === 'shopify') return 'shopify';
  if (normalized === 'standard_csv' || normalized === 'csv' || normalized === 'grabber_csv') {
    return 'standard_csv';
  }
  throw new Error('Unsupported sourceSystem. Use woocommerce, shopify, or standard_csv.');
}
