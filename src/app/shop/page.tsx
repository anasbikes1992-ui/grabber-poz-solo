import { readStorefrontConfig } from '@/lib/config/storefront-config';
import { StorefrontHome } from '@/components/storefront/storefront-home';
import { loadStorefrontCatalog } from '@/lib/storefront/catalog-service';

export const metadata = {
  title: 'Online Store | Grabber Commerce',
  description: 'Browse our live inventory catalog, add items to bag, and order online with fast delivery.',
};

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
