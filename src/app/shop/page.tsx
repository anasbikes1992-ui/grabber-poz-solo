import type { Metadata } from 'next';
import { readStorefrontConfig } from '@/lib/config/storefront-config';
import { StorefrontHome } from '@/components/storefront/storefront-home';
import { loadStorefrontCatalog } from '@/lib/storefront/catalog-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const cms = await readStorefrontConfig();
    const storeName = cms.theme?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'ThePartyStore';
    return {
      title: `${storeName} | Online Store`,
      description: `Browse live inventory catalog at ${storeName}, add items to bag, and order online with fast delivery.`,
    };
  } catch {
    return {
      title: 'ThePartyStore | Online Store',
      description: 'Browse our live inventory catalog, add items to bag, and order online with fast delivery.',
    };
  }
}

export default async function ShopCatalogPage() {
  const [cms, catalog] = await Promise.all([readStorefrontConfig(), loadStorefrontCatalog()]);
  return (
    <StorefrontHome
      cms={cms}
      initialCatalog={catalog.items}
      initialBranchId={catalog.branchId}
    />
  );
}
