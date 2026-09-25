import {
  DEFAULT_STOREFRONT,
  resolveStorefrontLayoutTemplate,
  type StorefrontBlock,
  type StorefrontConfig,
} from '@/lib/config/storefront-config.shared';
import type { VerticalPresetId, VerticalPreset } from '@/lib/config/vertical-presets';

export type StorefrontSeedMode = 'standard' | 'demo';

function storefrontPresetForVertical(presetId: VerticalPresetId) {
  if (presetId === 'mobilerepair' || presetId === 'electronics') return 'volta';
  if (presetId === 'restaurant') return 'hearth';
  if (presetId === 'grocery') return 'spindrift';
  return 'grabber';
}

function standardHeroTitle(presetId: VerticalPresetId, storeName: string) {
  if (presetId === 'mobilerepair' || presetId === 'electronics') return `${storeName} - Devices & Repairs`;
  if (presetId === 'restaurant') return `Welcome to ${storeName}`;
  return `${storeName} - Shop Online`;
}

function buildDemoBlocks(storeName: string): StorefrontBlock[] {
  return DEFAULT_STOREFRONT.blocks.map((block) => {
    if (block.type === 'ANNOUNCEMENT') {
      return {
        ...block,
        text: 'Live Grabber Demo: browse products, switch themes, and start checkout from one POS catalog.',
        ctaText: 'Open catalog',
        ctaUrl: '/shop#catalog',
        enabled: true,
      };
    }
    if (block.type === 'HERO_SLIDER') {
      return {
        ...block,
        enabled: true,
        slides: [
          {
            title: `${storeName} storefront demo`,
            subtitle: 'Pick an industry look, inspect live products, and start checkout with the same inventory model used by POS.',
            ctaLabel: 'Browse demo catalog',
            ctaHref: '/shop#catalog',
            badge: 'Live catalog',
          },
          {
            title: 'One stock truth for counter and online',
            subtitle: 'Use this demo to preview retail, fashion, repair, jewelry, party, and energy storefront styles.',
            ctaLabel: 'Try checkout',
            ctaHref: '/shop/checkout',
            badge: 'Theme picker',
          },
        ],
      };
    }
    if (block.type === 'HERO') {
      return {
        ...block,
        title: `${storeName} storefront demo`,
        subtitle: 'Switch industry templates while keeping checkout, stock, and POS behavior unchanged.',
        ctaLabel: 'Browse demo catalog',
        enabled: false,
      };
    }
    if (block.type === 'FOOTER_CTA') {
      return {
        ...block,
        title: 'Ready to see your catalog here?',
        body: 'Grabber runs a private single-business POS, stock, and storefront system for each merchant.',
        whatsappLabel: 'Book a walkthrough',
        enabled: true,
      };
    }
    return block;
  });
}

export function buildStorefrontSeedConfig(
  presetId: VerticalPresetId,
  preset: VerticalPreset,
  storeName: string,
  mode: StorefrontSeedMode = 'standard',
): StorefrontConfig {
  const themePresetId = storefrontPresetForVertical(presetId);

  if (mode === 'demo') {
    return {
      layoutTemplate: 'retail_wholesale',
      theme: {
        ...DEFAULT_STOREFRONT.theme,
        presetId: 'grabber',
        storeName,
      },
      blocks: buildDemoBlocks(storeName),
    };
  }

  const heroTitle = standardHeroTitle(presetId, storeName);
  const blocks = DEFAULT_STOREFRONT.blocks.map((block) => {
    if (block.type === 'HERO') {
      return { ...block, title: heroTitle, subtitle: preset.description };
    }
    if (block.type === 'HERO_SLIDER') {
      return {
        ...block,
        slides: block.slides.map((slide, index) =>
          index === 0 ? { ...slide, title: heroTitle, subtitle: preset.description } : slide,
        ),
      };
    }
    if (block.type === 'VERTICAL_PROMO' && preset.flags.repairs) {
      return { ...block, enabled: true };
    }
    return block;
  });

  return {
    layoutTemplate: resolveStorefrontLayoutTemplate(undefined, themePresetId, preset.flags),
    theme: {
      ...DEFAULT_STOREFRONT.theme,
      presetId: themePresetId,
      storeName,
    },
    blocks,
  };
}
