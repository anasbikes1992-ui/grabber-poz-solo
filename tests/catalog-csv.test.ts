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
});
