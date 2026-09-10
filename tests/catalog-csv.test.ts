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
      'Images',
      'Description',
    ]);
  });

  it('escapes commas, quotes, and protects long barcodes from Excel corruption', () => {
    expect(escapeCsvField('Hello, "World"')).toBe('"Hello, ""World"""');
    expect(escapeCsvField('8901234567890', 'Barcode')).toBe('="8901234567890"');
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
        Images: 'https://example.com/shirt.jpg',
        Description: '100% cotton shirt',
      },
    ]);
    const rows = parseProductCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Test Shirt');
    expect(rows[0].sku).toBe('TS-01');
    expect(rows[0].variantName).toBe('Size M');
    expect(rows[0].imageUrl).toBe('https://example.com/shirt.jpg');
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

  it('handles standard 41-column WooCommerce CSV export', () => {
    const headers = [
      'ID', 'Type', 'SKU', '"GTIN, UPC, EAN, or ISBN"', 'Name', 'Published', 'Is featured?',
      'Visibility in catalog', 'Short description', 'Description', 'Date sale price starts',
      'Date sale price ends', 'Tax status', 'Tax class', 'In stock?', 'Stock', 'Low stock amount',
      'Backorders allowed?', 'Sold individually?', 'Weight (g)', 'Length (cm)', 'Width (cm)',
      'Height (cm)', 'Allow customer reviews?', 'Purchase note', 'Sale price', 'Regular price',
      'Categories', 'Tags', 'Shipping class', 'Images', 'Download limit', 'Download expiry days',
      'Parent', 'Grouped products', 'Upsells', 'Cross-sells', 'External URL', 'Button text',
      'Position', 'Brands'
    ].join(',');

    const row1 = [
      '101', 'simple', 'WC-SKU-001', '8901234567890', 'Party Banner Gold', '1', '0',
      'visible', 'Gold metallic party banner', 'Full description here', '',
      '', 'taxable', 'standard', '1', '50', '5',
      '0', '0', '120', '30', '20',
      '5', '1', '', '1200.00', '1500.00',
      '"Party Supplies > Banners"', '"party,decor"', 'small', 'https://example.com/banner.jpg', '', '',
      '', '', '', '', '', '',
      '0', 'PartyStar'
    ].join(',');

    const csv = `${headers}\n${row1}`;
    const rows = parseProductCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Party Banner Gold');
    expect(rows[0].sku).toBe('WC-SKU-001');
    expect(rows[0].barcode).toBe('8901234567890');
    expect(rows[0].salePrice).toBe(1200); // Prefers sale price over regular price
    expect(rows[0].initialStock).toBe(50);
    expect(rows[0].category).toBe('Party Supplies');
    expect(rows[0].imageUrl).toBe('https://example.com/banner.jpg');
    expect(rows[0].description).toBe('Full description here');
    expect(rows[0].reorderLevel).toBe(5);
    expect(rows[0].isActive).toBe(true);
  });

  it('handles tab-separated 41-column export with fallback SKU from ID', () => {
    const headers = [
      'ID', 'Type', 'SKU', 'GTIN, UPC, EAN, or ISBN', 'Name', 'Published', 'Is featured?',
      'Visibility in catalog', 'Short description', 'Description', 'Date sale price starts',
      'Date sale price ends', 'Tax status', 'Tax class', 'In stock?', 'Stock', 'Low stock amount',
      'Backorders allowed?', 'Sold individually?', 'Weight (g)', 'Length (cm)', 'Width (cm)',
      'Height (cm)', 'Allow customer reviews?', 'Purchase note', 'Sale price', 'Regular price',
      'Categories', 'Tags', 'Shipping class', 'Images', 'Download limit', 'Download expiry days',
      'Parent', 'Grouped products', 'Upsells', 'Cross-sells', 'External URL', 'Button text',
      'Position', 'Brands'
    ].join('\t');

    const row1 = [
      '889', 'simple', '', '', 'Silver Confetti Popper', '1', '0',
      'visible', 'Short note', '', '',
      '', 'taxable', 'standard', '1', '25', '10',
      '0', '0', '', '', '',
      '', '1', '', '', '750.00',
      'Confetti, Party', '', '', '', '', '',
      '', '', '', '', '', '',
      '0', ''
    ].join('\t');

    const tsv = `${headers}\n${row1}`;
    const rows = parseProductCsv(tsv);

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Silver Confetti Popper');
    expect(rows[0].sku).toBe('WC-889'); // Auto-fallback to WC-ID
    expect(rows[0].salePrice).toBe(750);
    expect(rows[0].initialStock).toBe(25);
    expect(rows[0].category).toBe('Confetti');
    expect(rows[0].description).toBe('Short note');
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
