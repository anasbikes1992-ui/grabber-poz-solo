import type { Metadata } from 'next';
import { readStorefrontConfig } from '@/lib/config/storefront-config';
import { StorefrontHome } from '@/components/storefront/storefront-home';
import { loadStorefrontCatalog } from '@/lib/storefront/catalog-service';
import { DEFAULT_OG_IMAGE, absoluteUrl, siteBaseUrl } from '@/lib/storefront/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const cms = await readStorefrontConfig();
    const storeName = cms.theme?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Store';
    const desc = `Browse live inventory catalog at ${storeName}, add items to bag, and order online with fast delivery.`;
    const base = siteBaseUrl();
    const url = `${base}/shop`;
    const image = absoluteUrl(DEFAULT_OG_IMAGE, base);
    return {
      title: `${storeName} | Online Store`,
      description: desc,
      alternates: { canonical: url },
      openGraph: {
        title: `${storeName} | Online Store`,
        description: desc,
        url,
        siteName: storeName,
        type: 'website',
        images: [{ url: image, alt: `${storeName} online store` }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${storeName} | Online Store`,
        description: desc,
        images: [image],
      },
    };
  } catch {
    const fallbackName = process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Store';
    const base = siteBaseUrl();
    const image = absoluteUrl(DEFAULT_OG_IMAGE, base);
    return {
      title: `${fallbackName} | Online Store`,
      description: `Browse our live inventory catalog, add items to bag, and order online with fast delivery.`,
      alternates: { canonical: `${base}/shop` },
      openGraph: {
        title: `${fallbackName} | Online Store`,
        description: `Browse our live inventory catalog, add items to bag, and order online with fast delivery.`,
        url: `${base}/shop`,
        type: 'website',
        images: [{ url: image, alt: `${fallbackName} online store` }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${fallbackName} | Online Store`,
        description: `Browse our live inventory catalog, add items to bag, and order online with fast delivery.`,
        images: [image],
      },
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
