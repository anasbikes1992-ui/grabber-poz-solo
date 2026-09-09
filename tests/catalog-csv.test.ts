import { describe, expect, it } from 'vitest';
import {
  PRODUCT_CSV_HEADERS,
  assertCsvSize,
  buildProductCsv,
  escapeCsvField,
  MAX_PRODUCT_CSV_BYTES,
} from '../src/lib/catalog/catalog-csv';
import { parseProductCsv } from '../src/lib/catalog/product-import';

describe('catalog CSV import/export parity', () => {
  it('uses stable header columns', () => {
    expect(PRODUCT_CSV_HEADERS).toEqual([
      'Name',
      'Category',
      'SKU',
      'Barcode',
      'CostPrice',
      'SalePrice',
      'InitialStock',
      'VariantName',
    ]);
  });

  it('escapes commas and quotes in CSV fields', () => {
    expect(escapeCsvField('Hello, "World"')).toBe('"Hello, ""World"""');
  });

  it('round-trips parse and build with matching headers', () => {
    const csv = buildProductCsv([
      {
        Name: 'Test Shirt',
        Category: 'Apparel',
        SKU: 'TS-01',
        Barcode: '8901112223334',
        CostPrice: '2500.00',
        SalePrice: '4500.00',
        InitialStock: 20,
        VariantName: 'Size M',
      },
    ]);
    const rows = parseProductCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Test Shirt');
    expect(rows[0].sku).toBe('TS-01');
    expect(rows[0].variantName).toBe('Size M');
  });

  it('rejects CSV over size limit', () => {
    const huge = 'a'.repeat(MAX_PRODUCT_CSV_BYTES + 1);
    expect(() => assertCsvSize(huge)).toThrow(/exceeds/);
  });

  it('rejects empty CSV', () => {
    expect(() => assertCsvSize('   ')).toThrow(/empty/i);
  });

  it('handles WooCommerce headers and auto-generates missing SKUs', () => {
    const wcCsv = `Title,Categories,RegularPrice,Quantity\nOctopus Balloon,Party,450.00,10\nSea Horse Balloon,Party,550.00,15`;
    const rows = parseProductCsv(wcCsv);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Octopus Balloon');
    expect(rows[0].salePrice).toBe(450);
    expect(rows[0].sku).toBe('GEN-00001');
    expect(rows[1].sku).toBe('GEN-00002');
  });

  it('marks duplicate SKUs within the same CSV as COLLISION during validation', async () => {
    const { validateImportRows } = await import('../src/lib/catalog/product-import');
    const rows = [
      { name: 'Octopus Foil Balloon', sku: '8909', costPrice: 0, salePrice: 0, initialStock: 0 },
      { name: 'Sea Horse Foil Balloons', sku: '8909', costPrice: 0, salePrice: 0, initialStock: 0 },
    ];
    const preview = await validateImportRows(rows);
    expect(preview).toHaveLength(2);
    expect(preview[1].status).toBe('COLLISION');
    expect(preview[1].note).toContain('Duplicate SKU in CSV');
  });
});
