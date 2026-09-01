import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';
import {
  DEFAULT_STOREFRONT,
  normalizeBlock,
  type StorefrontBlock,
  type StorefrontConfig,
} from '@/lib/config/storefront-config.shared';

export type {
  StorefrontBlock,
  StorefrontConfig,
  StorefrontSlot,
  StorefrontTheme,
} from '@/lib/config/storefront-config.shared';
export { DEFAULT_STOREFRONT, blocksForSlot, normalizeBlock } from '@/lib/config/storefront-config.shared';

export async function readStorefrontConfig(): Promise<StorefrontConfig> {
  try {
    const cfg = await readConfigJson();
    const raw = (cfg.storefront || {}) as Partial<StorefrontConfig> & { blocks?: Record<string, unknown>[] };
    const mergedTheme = { ...DEFAULT_STOREFRONT.theme, ...(raw.theme || {}) };
    const blocks = raw.blocks?.length
      ? raw.blocks.map((b) => normalizeBlock(b as Record<string, unknown>)).filter(Boolean)
      : DEFAULT_STOREFRONT.blocks;
    return {
      theme: mergedTheme,
      blocks: (blocks.length ? blocks : DEFAULT_STOREFRONT.blocks) as StorefrontBlock[],
    };
  } catch {
    return DEFAULT_STOREFRONT;
  }
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
