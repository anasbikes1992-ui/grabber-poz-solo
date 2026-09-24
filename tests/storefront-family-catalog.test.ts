import { describe, expect, it } from 'vitest';
import { buildStorefrontFamilyItems } from '../src/lib/storefront/catalog-service';

describe('storefront family catalog projection', () => {
  it('renders one public family item for multiple variants', () => {
    const stockMap = new Map([
      ['p1:v1', 3],
      ['p1:v2', 4],
    ]);
    const items = buildStorefrontFamilyItems({
      products: [
        {
          id: 'p1',
          slug: 'gold-baubles',
          name: 'Gold Baubles Pack 6cm 20pc',
          sku: 'GOLD-BAUBLES',
          barcode: null,
          salePrice: '1000.00',
          costPrice: '0.00',
          imageUrl: '/image.jpg',
          description: 'Decor baubles',
          categoryId: 'cat1',
        },
      ],
      variantsByProduct: new Map([
        [
          'p1',
          [
            {
              id: 'v1',
              productId: 'p1',
              name: 'Gold / 6cm',
              sku: 'GOLD-6',
              barcode: null,
              salePrice: '900.00',
              costPrice: '100.00',
            },
            {
              id: 'v2',
              productId: 'p1',
              name: 'Rose Gold / 6cm',
              sku: 'ROSE-6',
              barcode: null,
              salePrice: '1200.00',
              costPrice: '150.00',
            },
          ],
        ],
      ]),
      categoryMap: new Map([['cat1', 'Christmas']]),
    stockMap,
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'p1',
      productId: 'p1',
      slug: 'gold-baubles',
      sku: 'GOLD-BAUBLES',
      unitPrice: 900,
      unitPriceMax: 1200,
      stock: 7,
      variant: '2 options',
      variantCount: 2,
      category: 'Christmas',
    });
    expect(items[0].variantId).toBeUndefined();
  });
});
