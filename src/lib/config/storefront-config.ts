import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';

export type StorefrontBlock =
  | { id: string; type: 'HERO'; title: string; subtitle: string; ctaLabel?: string }
  | { id: string; type: 'ANNOUNCEMENT'; text: string }
  | { id: string; type: 'FEATURED'; title: string; productSlugs: string[] };

export type StorefrontTheme = {
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  whatsappNumber?: string;
};

export type StorefrontConfig = {
  theme: StorefrontTheme;
  blocks: StorefrontBlock[];
};

export const DEFAULT_STOREFRONT: StorefrontConfig = {
  theme: {
    primaryColor: '#047857',
    accentColor: '#059669',
    fontFamily: 'Plus Jakarta Sans',
    whatsappNumber: '+94771234567',
  },
  blocks: [
    { id: 'ann_1', type: 'ANNOUNCEMENT', text: 'Free islandwide delivery on orders over LKR 10,000' },
    {
      id: 'hero_1',
      type: 'HERO',
      title: 'Shop Grabber',
      subtitle: 'Browse live inventory and place COD orders online — same catalog as your POS.',
      ctaLabel: 'Browse products',
    },
  ],
};

export async function readStorefrontConfig(): Promise<StorefrontConfig> {
  const cfg = await readConfigJson();
  const raw = (cfg.storefront || {}) as Partial<StorefrontConfig>;
  return {
    theme: { ...DEFAULT_STOREFRONT.theme, ...(raw.theme || {}) },
    blocks: raw.blocks?.length ? raw.blocks : DEFAULT_STOREFRONT.blocks,
  };
}

export async function writeStorefrontConfig(input: Partial<StorefrontConfig>) {
  const current = await readStorefrontConfig();
  const next: StorefrontConfig = {
    theme: { ...current.theme, ...(input.theme || {}) },
    blocks: input.blocks?.length ? input.blocks : current.blocks,
  };
  await mergeConfigJson({ storefront: next });
  return next;
}
