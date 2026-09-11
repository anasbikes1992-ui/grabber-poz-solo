import { readConfigJson } from '@/lib/config/business-settings';
import { readStorefrontConfig } from '@/lib/config/storefront-config';
import { DEFAULT_VERTICAL_FLAGS } from '@/lib/config/vertical-flags';
import SalonBook from './book-inner';

export const metadata = {
  title: 'Book a Service | Grabber Commerce',
  description: 'Book salon and barber appointments online — no login required.',
};

export default async function SalonBookPage() {
  const cms = await readStorefrontConfig();
  const cfg = await readConfigJson();
  const verticalFlags = { ...DEFAULT_VERTICAL_FLAGS, ...((cfg.verticalFlags as object) || {}) };
  return <SalonBook cms={cms} verticalFlags={verticalFlags} />;
}
