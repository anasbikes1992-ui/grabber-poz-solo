import type { MetadataRoute } from 'next';
import { siteBaseUrl } from '@/lib/storefront/seo';

export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/products/', '/shop/login'],
        disallow: [
          '/app',
          '/pos',
          '/api/',
          '/login',
          '/adminpoz',
          '/dashboard',
          '/settings',
          '/inventory',
          '/purchasing',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
