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

  it('normalizes WowThings POS exports into the universal catalog model', () => {
    const csv = [
      'Name,Barcode,Description,"Brand Name","Stock Date (Y-M-D)","Cost Price","Sale Price","Co-op/Wholesale Price","Max Discount Amount","Single Discount",Quantity/Stock,Category,"Expire Date (Y-M-D)","Warrenty Months","Supplier Name",isfood,"low qty",dis%,ingridient',
      'Maroon Abaya,CL10400,Premium abaya,Grabber Fashion,2026-08-29,10075,15500,14000,500,1,15,Clothing,0000-00-00,0,Mummy Clothes,0,5,10,',
      'Bad Stock,NEG-01,Bad stock sample,Grabber Fashion,2026-08-29,100,200,180,0,0,-4,Cosmetics,2026-12-31,0,Ruhi,0,0,0,',
    ].join('\n');

    const staged = stageCatalogImport(csv, 'standard_csv');

    expect(staged.sourceSystem).toBe('standard_csv');
    expect(staged.rows[0]).toMatchObject({
      title: 'Maroon Abaya',
      barcode: 'CL10400',
      costPrice: 10075,
      wholesalePrice: 14000,
      brandName: 'Grabber Fashion',
      supplierName: 'Mummy Clothes',
      expiryDate: null,
      stock: { status: 'provided', quantity: 15 },
    });
    expect(staged.rows[0].warnings).toContain('Stock quantity staged for review; physical count approval required.');
    expect(staged.rows[0].warnings).toContain('Invalid expiry date ignored.');
    expect(staged.rows[1].stock).toMatchObject({ status: 'invalid', quantity: -4 });
    expect(staged.rows[1].reviewRequired).toBe(true);
  });

  it('uses the same universal model for WooCommerce cost, gallery, and generated SKU review', () => {
    const csv = [
      [
        'ID',
        'Type',
        'SKU',
        'Name',
        'Published',
        'In stock?',
        'Stock',
        'Cost',
        'Sale price',
        'Regular price',
        'Categories',
        'Images',
        'Parent',
        'Attribute 1 name',
        'Attribute 1 value(s)',
      ].join(','),
      [
        '17355',
        'simple',
        '10386',
        'TRESemme Shampoo Moisture Rich',
        '1',
        '1',
        '-1',
        '225',
        '',
        '450',
        'Beauty & Personal Care',
        '"https://example.com/a.jpg, https://example.com/b.jpg"',
        '',
        '',
        '',
      ].join(','),
      [
        '200',
        'variation',
        '',
        'Color Variant',
        '1',
        '1',
        '',
        '100',
        '150',
        '200',
        'Fashion',
        '',
        'PARENT-SKU',
        'Color',
        'Gold',
      ].join(','),
    ].join('\n');

    const staged = stageCatalogImport(csv, 'woocommerce');

    expect(staged.rows[0]).toMatchObject({
      sourceId: '17355',
      costPrice: 225,
      currentPrice: 450,
      images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      stock: { status: 'invalid', quantity: -1 },
      reviewRequired: true,
    });
    expect(staged.rows[1]).toMatchObject({
      internalSku: 'WC-200',
      reviewRequired: true,
      attributes: { Color: 'Gold' },
    });
    expect(staged.rows[1].warnings).toContain('Missing source SKU; deterministic internal SKU generated and requires review.');
  });
});
