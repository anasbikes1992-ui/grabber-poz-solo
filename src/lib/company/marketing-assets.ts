import { existsSync } from 'fs';
import path from 'path';

/** Product screenshots the company site can show. Drop the file into public/marketing/ to enable it. */
export const MARKETING_SCREENSHOTS = {
  pos: 'pos-checkout.webp',
  inventory: 'inventory.webp',
  storefront: 'storefront-phone.webp',
  credit: 'credit-ledger.webp',
} as const;

export type MarketingAssetKey = keyof typeof MARKETING_SCREENSHOTS;
export type MarketingAssets = Record<MarketingAssetKey, boolean>;

/** Server-only: which screenshots actually exist, so the page never renders a broken image. */
export function availableMarketingAssets(dir = path.join(process.cwd(), 'public', 'marketing')): MarketingAssets {
  const out = {} as MarketingAssets;
  for (const [key, file] of Object.entries(MARKETING_SCREENSHOTS)) {
    out[key as MarketingAssetKey] = existsSync(path.join(dir, file));
  }
  return out;
}
