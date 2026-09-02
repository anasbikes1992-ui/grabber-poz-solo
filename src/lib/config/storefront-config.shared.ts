/** Client-safe storefront CMS types and defaults (no DB imports). */

export type StorefrontSlot = 'TOP' | 'HERO' | 'MID' | 'PRE_CATALOG' | 'FOOTER';

export type StorefrontBlock =
  | { id: string; type: 'ANNOUNCEMENT'; text: string; slot: 'TOP'; enabled?: boolean }
  | {
      id: string;
      type: 'HERO';
      title: string;
      subtitle: string;
      ctaLabel?: string;
      secondaryCtaLabel?: string;
      secondaryCtaHref?: string;
      slot: 'HERO';
      enabled?: boolean;
    }
  | {
      id: string;
      type: 'MID_BANNER';
      title: string;
      body: string;
      ctaLabel?: string;
      ctaHref?: string;
      slot: 'MID';
      enabled?: boolean;
    }
  | { id: string; type: 'FEATURED'; title: string; productSlugs: string[]; slot: 'PRE_CATALOG'; enabled?: boolean }
  | {
      id: string;
      type: 'FOOTER_CTA';
      title: string;
      body: string;
      whatsappLabel?: string;
      slot: 'FOOTER';
      enabled?: boolean;
    }
  | {
      id: string;
      type: 'VERTICAL_PROMO';
      vertical: 'repairs' | 'loyalty' | 'appointments' | 'wholesale';
      title: string;
      body: string;
      href: string;
      slot: 'MID' | 'PRE_CATALOG';
      enabled?: boolean;
    };

export type StorefrontTheme = {
  primaryColor: string;
  accentColor: string;
  secondaryColor?: string;
  fontFamily: string;
  whatsappNumber?: string;
};

export type StorefrontConfig = {
  theme: StorefrontTheme;
  blocks: StorefrontBlock[];
};

export const DEFAULT_STOREFRONT: StorefrontConfig = {
  theme: {
    primaryColor: '#1C1917',
    accentColor: '#A16207',
    secondaryColor: '#44403C',
    fontFamily: 'Rubik, Nunito Sans',
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || undefined,
  },
  blocks: [
    { id: 'ann_1', type: 'ANNOUNCEMENT', text: 'Free islandwide delivery on orders over LKR 10,000', slot: 'TOP', enabled: true },
    {
      id: 'hero_1',
      type: 'HERO',
      title: 'Shop Grabber',
      subtitle: 'Browse live inventory and place COD orders online — same catalog as your POS.',
      ctaLabel: 'Browse products',
      secondaryCtaLabel: 'Device repairs',
      secondaryCtaHref: '/shop/repairs',
      slot: 'HERO',
      enabled: true,
    },
    {
      id: 'mid_repairs',
      type: 'VERTICAL_PROMO',
      vertical: 'repairs',
      title: 'Expert device repairs',
      body: 'Screen, battery, water damage & more — track your ticket online.',
      href: '/shop/repairs',
      slot: 'MID',
      enabled: true,
    },
    {
      id: 'featured_1',
      type: 'FEATURED',
      title: 'Staff picks',
      productSlugs: [],
      slot: 'PRE_CATALOG',
      enabled: true,
    },
    {
      id: 'footer_1',
      type: 'FOOTER_CTA',
      title: 'Need help choosing?',
      body: 'Message us on WhatsApp for product advice or repair quotes.',
      whatsappLabel: 'Chat on WhatsApp',
      slot: 'FOOTER',
      enabled: true,
    },
  ],
};

export function normalizeBlock(raw: Record<string, unknown>): StorefrontBlock | null {
  const type = raw.type as string;
  const id = String(raw.id || `blk_${Date.now()}`);
  const enabled = raw.enabled !== false;

  if (type === 'ANNOUNCEMENT') {
    return { id, type: 'ANNOUNCEMENT', text: String(raw.text || ''), slot: 'TOP', enabled };
  }
  if (type === 'HERO') {
    return {
      id,
      type: 'HERO',
      title: String(raw.title || ''),
      subtitle: String(raw.subtitle || ''),
      ctaLabel: raw.ctaLabel ? String(raw.ctaLabel) : undefined,
      secondaryCtaLabel: raw.secondaryCtaLabel ? String(raw.secondaryCtaLabel) : undefined,
      secondaryCtaHref: raw.secondaryCtaHref ? String(raw.secondaryCtaHref) : undefined,
      slot: 'HERO',
      enabled,
    };
  }
  if (type === 'MID_BANNER') {
    return {
      id,
      type: 'MID_BANNER',
      title: String(raw.title || ''),
      body: String(raw.body || ''),
      ctaLabel: raw.ctaLabel ? String(raw.ctaLabel) : undefined,
      ctaHref: raw.ctaHref ? String(raw.ctaHref) : undefined,
      slot: 'MID',
      enabled,
    };
  }
  if (type === 'FEATURED') {
    return {
      id,
      type: 'FEATURED',
      title: String(raw.title || 'Featured'),
      productSlugs: Array.isArray(raw.productSlugs) ? raw.productSlugs.map(String) : [],
      slot: 'PRE_CATALOG',
      enabled,
    };
  }
  if (type === 'FOOTER_CTA') {
    return {
      id,
      type: 'FOOTER_CTA',
      title: String(raw.title || ''),
      body: String(raw.body || ''),
      whatsappLabel: raw.whatsappLabel ? String(raw.whatsappLabel) : undefined,
      slot: 'FOOTER',
      enabled,
    };
  }
  if (type === 'VERTICAL_PROMO') {
    const vertical = (raw.vertical as StorefrontBlock extends { vertical: infer V } ? V : never) || 'repairs';
    return {
      id,
      type: 'VERTICAL_PROMO',
      vertical: vertical as 'repairs' | 'loyalty' | 'appointments' | 'wholesale',
      title: String(raw.title || ''),
      body: String(raw.body || ''),
      href: String(raw.href || '/'),
      slot: (raw.slot as 'MID' | 'PRE_CATALOG') || 'MID',
      enabled,
    };
  }
  return null;
}

export function blocksForSlot(blocks: StorefrontBlock[], slot: StorefrontSlot): StorefrontBlock[] {
  return blocks.filter((b) => b.enabled !== false && 'slot' in b && b.slot === slot);
}
