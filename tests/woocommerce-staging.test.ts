import { describe, expect, it } from 'vitest';
import { stageWooCommerceCatalog } from '../src/lib/catalog/woocommerce-staging';

const headers = [
  'ID',
  'Type',
  'SKU',
  'Name',
  'Published',
  'In stock?',
  'Stock',
  'Sale price',
  'Regular price',
  'Categories',
  'Tags',
  'Images',
  'Parent',
  'Attribute 1 name',
  'Attribute 1 value(s)',
].join(',');

describe('WooCommerce catalog staging', () => {
  it('groups variable parents and children without writing stock decisions', () => {
    const csv = [
      headers,
      [
        '45',
        'variable',
        '"metallic10"""',
        'Metalllic Balloons 10inch 10pcs',
        '1',
        '1',
        '',
        '',
        '',
        '"Balloons > Latex > Metallic"',
        '"birthday,metallic"',
        'https://example.com/parent.jpg',
        '',
        'Colour',
        'Baby Pink, Gold',
      ].join(','),
      [
        '46',
        'variation',
        '',
        'Metalllic Balloons 10inch 10pcs - Baby Pink',
        '1',
        '1',
        '',
        '150',
        '200',
        '"Balloons > Latex > Metallic"',
        '"birthday,metallic"',
        'https://example.com/baby-pink.jpg',
        '"metallic10"""',
        'Colour',
        'Baby Pink',
      ].join(','),
    ].join('\n');

    const staged = stageWooCommerceCatalog(csv);

    expect(staged.summary).toMatchObject({
      totalRows: 2,
      variableParents: 1,
      childVariations: 1,
      orphanChildren: 0,
    });
    expect(staged.families[0].parent.sourceId).toBe('45');
    expect(staged.families[0].children[0]).toMatchObject({
      sourceId: '46',
      internalSku: 'WC-46',
      regularPrice: 200,
      salePrice: 150,
      currentPrice: 150,
      attributes: { Colour: 'Baby Pink' },
      stock: { status: 'flagOnly', quantity: null, inStockFlag: true },
    });
    expect(staged.families[0].children[0].warnings).toContain(
      'Stock is a source flag only; physical count required.',
    );
  });

  it('falls back to regular price when sale price is blank', () => {
    const csv = [
      headers,
      [
        '889',
        'simple',
        '',
        'Silver Confetti Popper',
        '1',
        '',
        '',
        '',
        '750.00',
        'Confetti',
        '',
        'https://example.com/confetti.jpg',
        '',
        '',
        '',
      ].join(','),
    ].join('\n');

    const staged = stageWooCommerceCatalog(csv);

    expect(staged.simpleProducts[0]).toMatchObject({
      sourceId: '889',
      internalSku: 'WC-889',
      salePrice: null,
      regularPrice: 750,
      currentPrice: 750,
      stock: { status: 'unknown', quantity: null, inStockFlag: null },
    });
  });

  it('quarantines negative stock instead of treating it as sellable stock', () => {
    const csv = [
      headers,
      [
        '777',
        'simple',
        'ICE-CANDLE-18',
        "Sparkling Iceberg Candles 18cm 6's",
        '1',
        '1',
        '-4',
        '',
        '450',
        'Candles',
        '',
        'https://example.com/candle.jpg',
        '',
        '',
        '',
      ].join(','),
    ].join('\n');

    const staged = stageWooCommerceCatalog(csv);

    expect(staged.simpleProducts[0].stock).toMatchObject({
      status: 'invalid',
      quantity: -4,
      inStockFlag: true,
    });
    expect(staged.simpleProducts[0].warnings).toContain(
      'Negative stock quarantined; do not create stock ledger movement.',
    );
  });

  it('keeps multiline WooCommerce descriptions inside the same staged row', () => {
    const csv = [
      [
        'ID',
        'Type',
        'SKU',
        'Name',
        'Published',
        'Description',
        'In stock?',
        'Regular price',
        'Categories',
        'Tags',
        'Images',
      ].join(','),
      [
        '45',
        'variable',
        'BALLOON-PARENT',
        'Metallic Balloons',
        '1',
        '"Line one\nLine two, with comma"',
        '1',
        '',
        '"Balloons > Latex"',
        '"party,decor"',
        'https://example.com/balloon.jpg',
      ].join(','),
    ].join('\n');

    const staged = stageWooCommerceCatalog(csv);

    expect(staged.summary.totalRows).toBe(1);
    expect(staged.rows[0].description).toBe('Line one\nLine two, with comma');
    expect(staged.rows[0].categories).toEqual([['Balloons', 'Latex']]);
  });
});
