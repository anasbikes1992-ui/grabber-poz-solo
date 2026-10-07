import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { siteBaseUrlFromHost } from '@/lib/storefront/seo';

export const dynamic = 'force-dynamic';

/** Staff surfaces that must not be indexed (POL-05). */
const STAFF_DISALLOW = [
  '/app',
  '/pos',
  '/api/',
  '/login',
  '/adminpoz',
  '/company',
  '/dashboard',
  '/settings',
  '/inventory',
  '/purchasing',
  '/restaurant',
  '/grocery',
  '/creative',
  '/repairs',
  '/hire-purchase',
  '/approvals',
  '/wholesale',
  '/whatsapp',
  '/loyalty',
  '/appointments',
  '/customers',
  '/suppliers',
  '/polim-potha',
  '/orders',
  '/reports',
  '/marketing',
  '/social',
  '/setup',
  '/onboarding',
  '/ops',
  '/ai',
  '/shifts',
  '/returns',
  '/delivery',
  '/discounts',
  '/barcodes',
  '/damages',
  '/quotations',
  '/warranties',
  '/serials',
  '/store/builder',
  '/accounts',
  '/shop/login',
  '/shop/checkout',
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  let base = siteBaseUrlFromHost();
  try {
    const h = await headers();
    base = siteBaseUrlFromHost(h.get('host') || h.get('x-forwarded-host'));
  } catch {
    // Unit tests can call robots() outside a Next request scope.
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/shop',
          '/shop/',
          '/products/',
          '/categories/',
          '/locations/',
          '/shop/repairs',
          '/terms',
          '/privacy',
          '/delivery-policy',
          '/refund-policy',
          '/contact',
        ],
        disallow: STAFF_DISALLOW,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
