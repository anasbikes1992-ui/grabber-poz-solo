import { createHash } from 'crypto';
import { parseProductCsv } from './product-import';
import {
  stageWooCommerceCatalog,
  type WooStagedRow,
  type WooStagingResult,
} from './woocommerce-staging';

export type CatalogImportSourceSystem = 'woocommerce' | 'shopify' | 'standard_csv';

export type GenericStagedCatalogRow = {
  rowIndex: number;
  sourceId: string;
  sourceHash: string;
  type: 'simple';
  title: string;
  rawSku: string;
  internalSku: string;
  parentRaw: string | null;
  regularPrice: number | null;
  salePrice: number | null;
  currentPrice: number | null;
  categories: string[][];
  tags: string[];
  images: string[];
  description: string | null;
  shortDescription: string | null;
  attributes: Record<string, string>;
  publishedInSource: boolean;
  stock: {
    status: 'unknown' | 'provided' | 'invalid' | 'flagOnly';
    quantity: number | null;
    inStockFlag: boolean | null;
  };
  warnings: string[];
};

export type CatalogStagingResult = WooStagingResult & {
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
  const rows: GenericStagedCatalogRow[] = parsedRows.map((row, index) => {
    const sourceId = genericSourceId(row, index + 1);
    const warnings: string[] = [];
    if (!row.sku) warnings.push('Missing source SKU; deterministic source row identity generated.');
    if (!row.imageUrl) warnings.push('No valid source image URL.');
    if (row.initialStock < 0) warnings.push('Negative stock quarantined; do not create stock ledger movement.');
    if (row.initialStock > 0) warnings.push('Stock quantity staged for review; physical count approval required.');

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
      regularPrice: row.salePrice || null,
      salePrice: null,
      currentPrice: row.salePrice || null,
      categories: row.category ? [[row.category]] : [],
      tags: [],
      images: row.imageUrl ? [row.imageUrl] : [],
      description: row.description || null,
      shortDescription: null,
      attributes,
      publishedInSource: row.isActive ?? true,
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
    rows: rows as unknown as WooStagedRow[],
    families: [],
    simpleProducts: rows as unknown as WooStagedRow[],
    orphanChildren: [],
    summary: {
      totalRows: rows.length,
      variableParents: 0,
      simpleProducts: rows.length,
      childVariations: 0,
      orphanChildren: 0,
      rowsWithWarnings: rows.filter((row) => row.warnings.length > 0).length,
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
