import type { Metadata } from 'next';
import { readStorefrontConfig } from '@/lib/config/storefront-config';
import { StorefrontHome } from '@/components/storefront/storefront-home';
import { loadStorefrontCatalog } from '@/lib/storefront/catalog-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const cms = await readStorefrontConfig();
    const storeName = cms.theme?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Store';
    const desc = `Browse live inventory catalog at ${storeName}, add items to bag, and order online with fast delivery.`;
    return {
      title: `${storeName} | Online Store`,
      description: desc,
      openGraph: {
        title: `${storeName} | Online Store`,
        description: desc,
        siteName: storeName,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${storeName} | Online Store`,
        description: desc,
      },
    };
  } catch {
    const fallbackName = process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Store';
    return {
      title: `${fallbackName} | Online Store`,
      description: `Browse our live inventory catalog, add items to bag, and order online with fast delivery.`,
    };
  }
}

export default async function ShopCatalogPage() {
  const [cms, catalog] = await Promise.all([readStorefrontConfig(), loadStorefrontCatalog()]);
  const storeName = cms.theme?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Store';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: storeName,
    description: `Online catalog and store for ${storeName} powered by Grabber Business OS.`,
    currenciesAccepted: 'LKR',
    priceRange: '$$',
    potentialAction: {
      '@type': 'SearchAction',
      target: '/shop?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StorefrontHome
        cms={cms}
        initialCatalog={catalog.items}
        initialBranchId={catalog.branchId}
      />
    </>
  );
}
