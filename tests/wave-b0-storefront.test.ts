import { describe, expect, it } from 'vitest';
import { normalizeBlock, DEFAULT_STOREFRONT } from '@/lib/config/storefront-config.shared';
import { promoBadgeLabel } from '@/components/storefront/ProductPromoBadge';
import { pickCatalogBadgePromo } from '@/lib/storefront/public-promotions';

describe('Wave B0 storefront restores', () => {
  it('normalizes rich ANNOUNCEMENT fields', () => {
    const block = normalizeBlock({
      id: 'a1',
      type: 'ANNOUNCEMENT',
      text: 'Weekend sale',
      promoCode: 'WEEKEND10',
      ctaText: 'Shop',
      ctaUrl: '/shop',
      endsAt: '2030-01-01T00:00:00.000Z',
    });
    expect(block).toMatchObject({
      type: 'ANNOUNCEMENT',
      promoCode: 'WEEKEND10',
      ctaText: 'Shop',
      ctaUrl: '/shop',
    });
  });

  it('default announcement includes CTA', () => {
    const ann = DEFAULT_STOREFRONT.blocks.find((b) => b.type === 'ANNOUNCEMENT');
    expect(ann?.type).toBe('ANNOUNCEMENT');
    if (ann?.type === 'ANNOUNCEMENT') {
      expect(ann.ctaText).toBeTruthy();
    }
  });

  it('promoBadgeLabel formats percent and fixed', () => {
    expect(promoBadgeLabel({ discountType: 'PERCENT', discountValue: 15 })).toBe('−15%');
    expect(promoBadgeLabel({ discountType: 'FIXED', discountValue: 500 })).toContain('500');
  });

  it('normalizes HERO_SLIDER slides', () => {
    const block = normalizeBlock({
      id: 'hs',
      type: 'HERO_SLIDER',
      slides: [{ title: 'A' }, { title: 'B', ctaHref: '/shop' }],
      autoplayMs: 5000,
    });
    expect(block?.type).toBe('HERO_SLIDER');
    if (block?.type === 'HERO_SLIDER') {
      expect(block.slides).toHaveLength(2);
      expect(block.autoplayMs).toBe(5000);
    }
  });
});
