import type { MetadataRoute } from 'next';
import { siteBaseUrl } from '@/lib/storefront/seo';

/** Staff surfaces that must not be indexed (POL-05). */
const STAFF_DISALLOW = [
  '/app',
  '/pos',
  '/api/',
  '/login',
  '/adminpoz',
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
];

export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/shop', '/shop/', '/products/', '/categories/', '/locations/', '/shop/repairs', '/shop/login'],
        disallow: STAFF_DISALLOW,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
