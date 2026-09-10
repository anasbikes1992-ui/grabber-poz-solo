import { describe, it, expect } from 'vitest';
import { buildCategoryMetadata, categoryJsonLd, categoryDescription } from '@/lib/storefront/seo';
import sitemap from '@/app/sitemap';

describe('Category SEO & Sitemap Expansion', () => {
  it('generates rich category description and metadata', () => {
    const desc = categoryDescription({ name: 'Fresh Fruits & Vegetables', productCount: 42 });
    expect(desc).toContain('Fresh Fruits & Vegetables');
    expect(desc).toContain('42 top-rated products');

    const meta = buildCategoryMetadata({
      name: 'Smartphones',
      slug: 'smartphones',
      productCount: 15,
      imageUrl: 'https://cdn.example.com/smartphones.jpg',
    });

    expect(meta.title).toBe('Smartphones Collection | Grabber Store');
    expect(meta.openGraph?.title).toBe('Smartphones | Grabber Store');
    expect(meta.openGraph?.images).toBeDefined();
    expect(meta.alternates?.canonical).toContain('/categories/smartphones');
  });

  it('generates valid CollectionPage and ItemList JSON-LD structured data', () => {
    const jsonLd = categoryJsonLd({
      name: 'Organic Dairy',
      slug: 'organic-dairy',
      products: [
        {
          name: 'Fresh Farm Milk 1L',
          slug: 'fresh-farm-milk-1l',
          salePrice: 450,
          imageUrl: 'https://cdn.example.com/milk.jpg',
        },
        {
          name: 'Natural Curd 500g',
          slug: 'natural-curd-500g',
          salePrice: 280,
          imageUrl: null,
        },
      ],
    });

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('CollectionPage');
    expect(jsonLd.mainEntity['@type']).toBe('ItemList');
    expect(jsonLd.mainEntity.numberOfItems).toBe(2);
    expect(jsonLd.mainEntity.itemListElement[0].name).toBe('Fresh Farm Milk 1L');
    expect(jsonLd.mainEntity.itemListElement[0].position).toBe(1);
    expect(jsonLd.mainEntity.itemListElement[0].url).toContain('/products/fresh-farm-milk-1l');
  });

  it('generates sitemap with expanded shop, repair, category, and product routes', async () => {
    const map = await sitemap();
    expect(Array.isArray(map)).toBe(true);
    expect(map.length).toBeGreaterThanOrEqual(4);

    const urls = map.map((entry) => entry.url);
    expect(urls.some((u) => u.endsWith('/shop'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/shop/repairs'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/shop/repairs/book'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/shop/repairs/track'))).toBe(true);
  });
});
