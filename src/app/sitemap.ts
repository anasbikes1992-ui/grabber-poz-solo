import type { MetadataRoute } from 'next';
import { listCategorySlugs, listPublishedProductSlugs } from '@/lib/storefront/catalog-server';
import { siteBaseUrl } from '@/lib/storefront/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/shop/checkout`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  try {
    const [products, categories] = await Promise.all([
      listPublishedProductSlugs(),
      listCategorySlugs(),
    ]);
    const productRoutes = products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    const categoryRoutes = categories.map((c) => ({
      url: `${base}/categories/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
