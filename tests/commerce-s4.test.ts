import { describe, it, expect } from 'vitest';
import { parseProductCsv } from '../src/lib/catalog/product-import';

describe('product-import parser', () => {
  it('parses standard CSV headers', () => {
    const csv = `Name,Category,SKU,Barcode,CostPrice,SalePrice,InitialStock
Cotton Shirt,Apparel,CTN-01,890111,2500,4500,20`;
    const rows = parseProductCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Cotton Shirt');
    expect(rows[0].sku).toBe('CTN-01');
    expect(rows[0].salePrice).toBe(4500);
    expect(rows[0].initialStock).toBe(20);
  });

  it('supports optional variant column', () => {
    const csv = `Name,SKU,SalePrice,VariantName
Shirt,SH-01,4000,Size L / Blue`;
    const rows = parseProductCsv(csv);
    expect(rows[0].variantName).toBe('Size L / Blue');
  });

  it('returns empty for header-only CSV', () => {
    expect(parseProductCsv('Name,SKU')).toEqual([]);
  });
});
