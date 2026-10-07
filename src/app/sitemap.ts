import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { listCategorySlugs, listPublishedProductSlugs } from '@/lib/storefront/catalog-server';
import { siteBaseUrlFromHost } from '@/lib/storefront/seo';
import { PUBLIC_LEGAL_ROUTES } from '@/lib/public/legal-pages';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let base = siteBaseUrlFromHost();
  try {
    const h = await headers();
    base = siteBaseUrlFromHost(h.get('host') || h.get('x-forwarded-host'));
  } catch {
    // Unit tests call sitemap() outside a Next request scope.
  }
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/shop/repairs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/shop/repairs/book`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/shop/repairs/track`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/track`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/locations`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    ...PUBLIC_LEGAL_ROUTES.map((route) => ({
      url: `${base}${route}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: route === '/contact' ? 0.7 : 0.55,
    })),
  ];

  try {
    const { listLocationSlugs } = await import('@/lib/seo/location-pages');
    const [products, categories, locationSlugs] = await Promise.all([
      listPublishedProductSlugs(),
      listCategorySlugs(),
      listLocationSlugs().catch(() => [] as string[]),
    ]);

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${base}/categories/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const locationRoutes: MetadataRoute.Sitemap = locationSlugs.map((slug) => ({
      url: `${base}/locations/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...locationRoutes];
  } catch {
    return staticRoutes;
  }
}
