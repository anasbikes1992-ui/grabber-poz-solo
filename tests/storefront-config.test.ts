import { describe, it, expect } from 'vitest';
import { blocksForSlot, DEFAULT_STOREFRONT } from '../src/lib/config/storefront-config';
import { VERTICAL_PRESETS } from '../src/lib/config/vertical-presets';
import { buildStorefrontSeedConfig } from '../src/lib/setup/storefront-seed-config';

describe('storefront CMS blocks', () => {
  it('defines banner slots in default config', () => {
    expect(blocksForSlot(DEFAULT_STOREFRONT.blocks, 'TOP').length).toBeGreaterThan(0);
    expect(blocksForSlot(DEFAULT_STOREFRONT.blocks, 'HERO').length).toBeGreaterThan(0);
    expect(blocksForSlot(DEFAULT_STOREFRONT.blocks, 'FOOTER').length).toBeGreaterThan(0);
  });

  it('filters disabled blocks', () => {
    const blocks = DEFAULT_STOREFRONT.blocks.map((b) =>
      b.id === 'ann_1' ? { ...b, enabled: false } : b,
    );
    expect(blocksForSlot(blocks, 'TOP')).toHaveLength(0);
  });

  it('includes mid vertical promo by default', () => {
    const mid = blocksForSlot(DEFAULT_STOREFRONT.blocks, 'MID');
    expect(mid.some((b) => b.type === 'VERTICAL_PROMO')).toBe(true);
  });

  it('defaults to a retail wholesale layout template', () => {
    expect(DEFAULT_STOREFRONT.layoutTemplate).toBe('retail_wholesale');
  });

  it('brands demo seed config without changing commerce behavior', () => {
    const config = buildStorefrontSeedConfig('fashion', VERTICAL_PRESETS.fashion, 'Grabber Demo', 'demo');
    const heroSlides = blocksForSlot(config.blocks, 'HERO').find((b) => b.type === 'HERO_SLIDER');

    expect(config.layoutTemplate).toBe('retail_wholesale');
    expect(config.theme.storeName).toBe('Grabber Demo');
    expect(config.theme.presetId).toBe('grabber');
    expect(heroSlides && heroSlides.type === 'HERO_SLIDER' ? heroSlides.slides[0]?.title : '').toContain('Grabber Demo');
  });

  it('keeps repair seed storefronts on the tech repair template', () => {
    const config = buildStorefrontSeedConfig('electronics', VERTICAL_PRESETS.electronics, 'QuickFix', 'standard');
    expect(config.layoutTemplate).toBe('tech_repair');
  });
});
