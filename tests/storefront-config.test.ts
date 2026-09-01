import { describe, it, expect } from 'vitest';
import { blocksForSlot, DEFAULT_STOREFRONT } from '../src/lib/config/storefront-config';

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
});
