import { readConfigJson } from '@/lib/config/business-settings';
import { readStorefrontConfig } from '@/lib/config/storefront-config';
import { DEFAULT_VERTICAL_FLAGS } from '@/lib/config/vertical-flags';
import PublicDiningMenu from './menu-inner';

export const metadata = {
  title: 'Dining Menu | Grabber Commerce',
  description: 'Browse the full dining menu — categories, descriptions and live prices.',
};

export default async function PublicDiningMenuPage() {
  const cms = await readStorefrontConfig();
  const cfg = await readConfigJson();
  const verticalFlags = { ...DEFAULT_VERTICAL_FLAGS, ...((cfg.verticalFlags as object) || {}) };
  return <PublicDiningMenu cms={cms} verticalFlags={verticalFlags} />;
}
