import { describe, expect, it } from 'vitest';
import { parseCatalogImportSourceSystem, stageCatalogImport } from '../src/lib/catalog/catalog-import-staging';

describe('generic catalog import staging', () => {
  it('normalizes supported source system names', () => {
    expect(parseCatalogImportSourceSystem('woo')).toBe('woocommerce');
    expect(parseCatalogImportSourceSystem('Shopify')).toBe('shopify');
    expect(parseCatalogImportSourceSystem('grabber-csv')).toBe('standard_csv');
  });

  it('stages standard CSV without committing products or stock', () => {
    const csv = `Name,Category,SKU,SalePrice,InitialStock,Images,Description
Party Hat,Party,PH-01,250,12,https://example.com/hat.jpg,Paper hat`;

    const staged = stageCatalogImport(csv, 'standard_csv');

    expect(staged.sourceSystem).toBe('standard_csv');
    expect(staged.summary).toMatchObject({
      totalRows: 1,
      simpleProducts: 1,
      variableParents: 0,
      childVariations: 0,
    });
    expect(staged.simpleProducts[0]).toMatchObject({
      sourceId: 'PH-01',
      internalSku: 'PH-01',
      title: 'Party Hat',
      stock: { status: 'provided', quantity: 12, inStockFlag: null },
    });
    expect(staged.simpleProducts[0].warnings).toContain(
      'Stock quantity staged for review; physical count approval required.',
    );
  });

  it('stages Shopify-like CSV through the generic parser', () => {
    const csv = `Title,Variant SKU,Variant Price,Image Src
Foil Star,STAR-GOLD,650,https://example.com/star.jpg`;

    const staged = stageCatalogImport(csv, 'shopify');

    expect(staged.sourceSystem).toBe('shopify');
    expect(staged.simpleProducts[0]).toMatchObject({
      sourceId: 'STAR-GOLD',
      title: 'Foil Star',
      currentPrice: 650,
    });
  });
});
