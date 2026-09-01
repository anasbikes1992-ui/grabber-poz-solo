import { readStorefrontConfig } from '@/lib/config/storefront-config';
import { StorefrontHome } from '@/components/storefront/storefront-home';

export default async function StorefrontPage() {
  const cms = await readStorefrontConfig();
  return <StorefrontHome cms={cms} />;
}
