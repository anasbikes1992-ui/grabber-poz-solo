import { describe, expect, it } from 'vitest';
import {
  buildCatalogImportApplyPlan,
  type CatalogImportApplyRow,
} from '../src/lib/catalog/catalog-import-apply-plan';
import type { UniversalCatalogRowType } from '../src/lib/catalog/universal-catalog';

function row(partial: Partial<CatalogImportApplyRow> & { sourceId: string; rowType: UniversalCatalogRowType; title?: string }): CatalogImportApplyRow {
  return {
    sourceSystem: 'woocommerce',
    sourceNamespace: 'client-a',
    internalSku: `SKU-${partial.sourceId}`,
    parentSourceId: null,
    title: partial.title || `Row ${partial.sourceId}`,
    rowJson: {
      rowIndex: 1,
      sourceId: partial.sourceId,
      sourceHash: `hash-${partial.sourceId}`,
      type: partial.rowType,
      title: partial.title || `Row ${partial.sourceId}`,
      rawSku: `SKU-${partial.sourceId}`,
      internalSku: `SKU-${partial.sourceId}`,
      parentRaw: null,
      barcode: null,
      costPrice: null,
      wholesalePrice: null,
      regularPrice: 100,
      salePrice: null,
      currentPrice: 100,
      categories: [],
      tags: [],
      images: [],
      brandName: null,
      supplierName: null,
      expiryDate: null,
      warrantyMonths: null,
      maxDiscountAmount: null,
      singleDiscount: null,
      discountPercent: null,
      dimensions: {
        weightValue: null,
        weightUnit: null,
        lengthCm: null,
        widthCm: null,
        heightCm: null,
      },
      description: null,
      shortDescription: null,
      attributes: {},
      publishedInSource: true,
      itemType: 'PHYSICAL',
      reviewRequired: false,
      raw: {},
      stock: { status: 'unknown', quantity: null, inStockFlag: null },
      warnings: [],
    },
    warningsJson: [],
    ...partial,
  };
}

describe('catalog import apply planner', () => {
  it('skips rows with existing external mappings for idempotent re-apply', () => {
    const plan = buildCatalogImportApplyPlan({
      rows: [row({ sourceId: '101', rowType: 'simple' })],
      existingMappings: [{ sourceId: '101', productId: 'p1', variantId: null }],
      existingSkus: new Set(),
    });

    expect(plan.actions[0].type).toBe('skip_mapped');
    expect(plan.skipCount).toBe(1);
    expect(plan.createCount).toBe(0);
  });

  it('flags SKU conflicts when no source mapping exists', () => {
    const plan = buildCatalogImportApplyPlan({
      rows: [row({ sourceId: '101', rowType: 'simple', internalSku: 'DUP-1' })],
      existingMappings: [],
      existingSkus: new Set(['DUP-1']),
    });

    expect(plan.actions[0]).toMatchObject({ type: 'conflict_sku', sku: 'DUP-1' });
    expect(plan.conflictCount).toBe(1);
  });

  it('creates variable parent and child variant when approved together', () => {
    const parent = row({ sourceId: '45', rowType: 'variable', internalSku: 'BALLOON-PARENT' });
    const child = row({
      sourceId: '46',
      rowType: 'variation',
      parentSourceId: '45',
      internalSku: 'WC-46',
      rowJson: {
        ...row({ sourceId: '46', rowType: 'variation' }).rowJson,
        parentRaw: '45',
        internalSku: 'WC-46',
      },
    });

    const plan = buildCatalogImportApplyPlan({
      rows: [parent, child],
      existingMappings: [],
      existingSkus: new Set(),
    });

    expect(plan.actions.map((action) => action.type)).toEqual(['create_product', 'create_variant']);
    expect(plan.createCount).toBe(2);
  });
});
