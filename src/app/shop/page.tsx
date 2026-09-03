import { readStorefrontConfig } from '@/lib/config/storefront-config';
import { StorefrontHome } from '@/components/storefront/storefront-home';

export const metadata = {
  title: 'Online Store | Grabber Commerce',
  description: 'Browse our live inventory catalog, add items to bag, and order online with fast delivery.',
};

export default async function ShopCatalogPage() {
  const cms = await readStorefrontConfig();
  return <StorefrontHome cms={cms} />;
}
