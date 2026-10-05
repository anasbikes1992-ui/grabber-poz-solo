import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { readStorefrontConfig } from '@/lib/config/storefront-config';
import { resolveLandingMode } from '@/lib/config/landing-mode';
import { loadStorefrontCatalog, toPublicCatalogItem } from '@/lib/storefront/catalog-service';
import { DEFAULT_OG_IMAGE, absoluteUrl, siteBaseUrlFromHost } from '@/lib/storefront/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COMPANY_DESCRIPTION =
  'Run your shop counter, touch POS, barcodes, inventory, customer credit (Polim Potha), online store, and Sri Lankan payment gateways from one connected standalone system.';

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get('host') || h.get('x-forwarded-host');
  const mode = resolveLandingMode(host);
  const base = siteBaseUrlFromHost(host);
  const ogImage = absoluteUrl(DEFAULT_OG_IMAGE, base);

  if (mode === 'storefront') {
    const cms = await readStorefrontConfig().catch(() => null);
    const storeName = cms?.theme?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Demo Store';
    const desc = `Browse live inventory at ${storeName}, add items to bag, and order online with fast delivery.`;
    return {
      title: `${storeName} | Online Store`,
      description: desc,
      alternates: { canonical: base },
      openGraph: {
        title: `${storeName} | Online Store`,
        description: desc,
        url: base,
        siteName: storeName,
        type: 'website',
        images: [{ url: ogImage, alt: `${storeName} online store` }],
      },
      twitter: { card: 'summary_large_image', title: `${storeName} | Online Store`, description: desc, images: [ogImage] },
    };
  }

  return {
    title: 'Grabber POZ | The All-in-One Retail & Commerce OS for Sri Lanka',
    description: COMPANY_DESCRIPTION,
    keywords: [
      'POS Sri Lanka',
      'retail POS Sri Lanka',
      'inventory management Sri Lanka',
      'online store Sri Lanka',
      'retail management software Sri Lanka',
      'Polim Potha software',
      'POS and online store Sri Lanka',
    ],
    alternates: { canonical: base },
    openGraph: {
      title: 'Grabber POZ | Retail & Commerce OS for Sri Lanka',
      description:
        'High-speed touch POS, Polim Potha credit ledger, multi-branch inventory, and integrated Sri Lankan payment gateways.',
      url: base,
      siteName: 'Grabber POZ',
      type: 'website',
      images: [{ url: ogImage, alt: 'Grabber POZ retail and commerce OS' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Grabber POZ | Retail & Commerce OS for Sri Lanka',
      description: COMPANY_DESCRIPTION,
      images: [ogImage],
    },
  };
}

export default async function HomePage() {
  const h = await headers();
  const mode = resolveLandingMode(h.get('host') || h.get('x-forwarded-host'));

  if (mode === 'storefront') {
    const [{ StorefrontHome }, cms, catalog] = await Promise.all([
      import('@/components/storefront/storefront-home'),
      readStorefrontConfig(),
      loadStorefrontCatalog(),
    ]);
    return (
      <StorefrontHome
        cms={cms}
        initialCatalog={catalog.items.map(toPublicCatalogItem)}
        initialBranchId={catalog.branchId}
      />
    );
  }

  const { CompanyLanding } = await import('@/components/company/CompanyLanding');
  return <CompanyLanding demoUrl={process.env.COMPANY_DEMO_URL || 'https://demo.grabberpoz.com'} />;
}
