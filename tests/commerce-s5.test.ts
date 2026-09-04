import { describe, it, expect } from 'vitest';
import { buildProductMetadata, productDescription, productJsonLd, siteBaseUrl } from '../src/lib/storefront/seo';

describe('storefront seo helpers', () => {
  it('builds product description with price and stock', () => {
    const desc = productDescription({
      name: 'Linen Shirt',
      category: 'Apparel',
      salePrice: 4500,
      inStock: true,
    });
    expect(desc).toContain('Linen Shirt');
    expect(desc).toContain('4,500');
    expect(desc).toContain('In stock');
  });

  it('builds metadata with canonical url', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    const meta = buildProductMetadata({
      name: 'Linen Shirt',
      slug: 'linen-shirt-ab12',
      description: 'Test product',
      salePrice: 4500,
    });
    expect(meta.title).toContain('Linen Shirt');
    expect(meta.alternates?.canonical).toBe('https://example.com/products/linen-shirt-ab12');
  });

  it('emits Product JSON-LD', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    const json = productJsonLd({
      name: 'Linen Shirt',
      slug: 'linen-shirt-ab12',
      sku: 'LIN-01',
      description: 'Test',
      salePrice: 4500,
      inStock: true,
    });
    expect(json['@type']).toBe('Product');
    expect(json.offers.priceCurrency).toBe('LKR');
    expect(json.offers.availability).toContain('InStock');
  });

  it('resolves site base url from env', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://grabber-poz-solo.vercel.app/';
    expect(siteBaseUrl()).toBe('https://grabber-poz-solo.vercel.app');
  });
});
