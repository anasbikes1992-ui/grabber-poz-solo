import type { StorefrontConfig, StorefrontTheme } from '@/lib/config/storefront-config.shared';

export type StorefrontHeroStyle = 'classic' | 'cinematic' | 'glass' | 'minimal' | 'bold';
export type StorefrontCardStyle = 'glass' | 'flat' | 'elevated';
export type StorefrontColorScheme = 'light' | 'dark';

export type StorefrontThemePreset = {
  id: string;
  label: string;
  description: string;
  /** Inspired by showcase projects on vulk.dev — original palettes, not copied code. */
  inspiration: string;
  tags: string[];
  theme: StorefrontTheme;
  /** Optional hero copy applied when switching presets in the builder. */
  heroCopy?: { title?: string; subtitle?: string; ctaLabel?: string };
};

const BASE_THEME: StorefrontTheme = {
  presetId: 'grabber',
  primaryColor: '#1C1917',
  accentColor: '#A16207',
  secondaryColor: '#44403C',
  backgroundColor: '#FAFAF9',
  foregroundColor: '#0C0A09',
  mutedColor: '#E8ECF0',
  borderColor: '#D6D3D1',
  onPrimaryColor: '#FFFFFF',
  repairColor: '#0F766E',
  fontFamily: 'Rubik, Nunito Sans',
  heroStyle: 'classic',
  heroGradient:
    'linear-gradient(120deg, rgba(161,98,7,0.10) 0%, transparent 55%), radial-gradient(ellipse at 80% 0%, rgba(161,98,7,0.06) 0%, transparent 50%)',
  cardStyle: 'elevated',
  colorScheme: 'light',
};

/** Curated presets aligned to Grabber storefront tokens (CSS vars on `.storefront`). */
export const STOREFRONT_THEME_PRESETS: StorefrontThemePreset[] = [
  {
    id: 'party-pop',
    label: 'Party Pop & Confetti',
    description: 'Vibrant rose & royal party blue with live floating celebration confetti.',
    inspiration: 'ThePartyStore Celebration Engine',
    tags: ['interactive', 'confetti', 'party', 'playful'],
    theme: {
      presetId: 'party-pop',
      primaryColor: '#E11D48',
      accentColor: '#2563EB',
      secondaryColor: '#9F1239',
      backgroundColor: '#FFF1F2',
      foregroundColor: '#881337',
      mutedColor: '#FFE4E6',
      borderColor: '#FECDD3',
      onPrimaryColor: '#FFFFFF',
      repairColor: '#7C3AED',
      fontFamily: 'Outfit, Nunito Sans',
      heroStyle: 'bold',
      heroGradient:
        'radial-gradient(ellipse at 20% 0%, rgba(225,29,72,0.18) 0%, transparent 60%), radial-gradient(ellipse at 90% 20%, rgba(37,99,235,0.15) 0%, transparent 50%), linear-gradient(180deg, rgba(255,241,242,0.65) 0%, rgba(255,255,255,0.5) 100%)',
      cardStyle: 'elevated',
      colorScheme: 'light',
      interactiveFx: 'confetti',
      carouselEffect: 'spring-showcase',
      tickerText: '🎉 MAKE EVERY PARTY POP • BALLOONS, THEMES, CANDLES & TABLEWARE • ISLANDWIDE COD DELIVERY',
    },
    heroCopy: {
      title: 'Make every party pop',
      subtitle: 'Balloons, birthday packs, cake toppers, tableware, and seasonal decorations - ready for pickup or delivery.',
      ctaLabel: 'Shop party supplies',
    },
  },
  {
    id: 'neon-carnival',
    label: 'Midnight Neon Carnival',
    description: 'Electric cyan & neon magenta over obsidian with pulsing cyber glow.',
    inspiration: 'Cyber Festival & Night Carnival',
    tags: ['interactive', 'neon', 'dark', 'glow'],
    theme: {
      presetId: 'neon-carnival',
      primaryColor: '#06B6D4',
      accentColor: '#F43F5E',
      secondaryColor: '#94A3B8',
      backgroundColor: '#070913',
      foregroundColor: '#F8FAFC',
      mutedColor: '#0F172A',
      borderColor: '#1E293B',
      onPrimaryColor: '#070913',
      repairColor: '#A855F7',
      fontFamily: 'Plus Jakarta Sans, Space Grotesk',
      heroStyle: 'cinematic',
      heroGradient:
        'radial-gradient(ellipse at 30% 0%, rgba(6,182,212,0.22) 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(244,63,94,0.18) 0%, transparent 55%), linear-gradient(180deg, rgba(7,9,19,0.85) 0%, rgba(15,23,42,0.95) 100%)',
      cardStyle: 'glass',
      colorScheme: 'dark',
      interactiveFx: 'neon',
      carouselEffect: 'cyber-glow',
      tickerText: '⚡ NEON NIGHT CELEBRATION • GLOW BALLOONS, LED DÉCOR & VIP PARTY PACKS • LIVE POS INVENTORY',
    },
    heroCopy: {
      title: 'Electrify your celebration',
      subtitle: 'Glow accessories, themed LED setups, radiant balloons, and neon tableware for modern events.',
      ctaLabel: 'Explore neon party',
    },
  },
  {
    id: 'royal-gold',
    label: 'Imperial Champagne & Gold',
    description: 'Silk cream & metallic gold with glistening luxury shimmer particles.',
    inspiration: 'Luxury VIP Weddings & Milestone Anniversaries',
    tags: ['interactive', 'gold', 'luxury', 'elegance'],
    theme: {
      presetId: 'royal-gold',
      primaryColor: '#B45309',
      accentColor: '#F59E0B',
      secondaryColor: '#78716C',
      backgroundColor: '#FCFBF7',
      foregroundColor: '#1C1917',
      mutedColor: '#F5EFE6',
      borderColor: '#E7DEC8',
      onPrimaryColor: '#FFFFFF',
      repairColor: '#D97706',
      fontFamily: 'Playfair Display, Outfit',
      heroStyle: 'classic',
      heroGradient:
        'radial-gradient(ellipse at 25% 10%, rgba(245,158,11,0.18) 0%, transparent 55%), radial-gradient(circle at 85% 30%, rgba(217,119,6,0.12) 0%, transparent 50%), linear-gradient(180deg, rgba(252,251,247,0.7) 0%, rgba(245,239,230,0.5) 100%)',
      cardStyle: 'elevated',
      colorScheme: 'light',
      interactiveFx: 'gold',
      carouselEffect: 'ken-burns',
      tickerText: '👑 LUXURY CELEBRATION SUITE • GOLD FOIL BALLOONS, METALLIC ARCHES & CHAMPAGNE ACCESSORIES',
    },
    heroCopy: {
      title: 'Elegance in every detail',
      subtitle: 'Curated gold foil balloons, silk runners, crystal toppers, and premium party tableware.',
      ctaLabel: 'View luxury collection',
    },
  },
  {
    id: 'pastel-wonderland',
    label: 'Pastel Dreamland',
    description: 'Cotton candy lilac & blossom pink with whimsical floating balloons & bubbles.',
    inspiration: 'Baby Showers, First Birthdays & Fairy-Tale Parties',
    tags: ['interactive', 'bubbles', 'pastel', 'baby-shower'],
    theme: {
      presetId: 'pastel-wonderland',
      primaryColor: '#8B5CF6',
      accentColor: '#EC4899',
      secondaryColor: '#A855F7',
      backgroundColor: '#FDF4FF',
      foregroundColor: '#4C1D95',
      mutedColor: '#FAE8FF',
      borderColor: '#F5D0FE',
      onPrimaryColor: '#FFFFFF',
      repairColor: '#06B6D4',
      fontFamily: 'Nunito Sans, Outfit',
      heroStyle: 'minimal',
      heroGradient:
        'radial-gradient(ellipse at 20% 10%, rgba(236,72,153,0.16) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.15) 0%, transparent 50%), linear-gradient(180deg, rgba(253,244,255,0.7) 0%, rgba(250,232,255,0.5) 100%)',
      cardStyle: 'elevated',
      colorScheme: 'light',
      interactiveFx: 'bubbles',
      carouselEffect: 'parallax-wave',
      tickerText: '🎈 PASTEL DREAMLAND • BABY SHOWER PACKAGES, GENDER REVEAL DÉCOR & CUTE CHARACTER THEMES',
    },
    heroCopy: {
      title: 'Magical moments & smiles',
      subtitle: 'Soft pastel arch kits, baby shower decoration packages, plush toppers, and gentle color palettes.',
      ctaLabel: 'Shop baby & kids',
    },
  },
  {
    id: 'cyber-kinetic',
    label: 'Hyper Kinetic & Super Sale',
    description: 'High-contrast volt yellow & laser red with live moving ticker marquee.',
    inspiration: 'Mega Blowout Party Sale & High Energy Retail',
    tags: ['interactive', 'ticker', 'bold', 'kinetic'],
    theme: {
      presetId: 'cyber-kinetic',
      primaryColor: '#FACC15',
      accentColor: '#EF4444',
      secondaryColor: '#A1A1AA',
      backgroundColor: '#09090B',
      foregroundColor: '#FFFFFF',
      mutedColor: '#18181B',
      borderColor: '#27272A',
      onPrimaryColor: '#09090B',
      repairColor: '#F59E0B',
      fontFamily: 'Outfit, Plus Jakarta Sans',
      heroStyle: 'bold',
      heroGradient:
        'radial-gradient(ellipse at 20% 0%, rgba(250,204,21,0.22) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, rgba(239,68,68,0.18) 0%, transparent 50%), linear-gradient(180deg, rgba(9,9,11,0.9) 0%, rgba(24,24,27,0.95) 100%)',
      cardStyle: 'flat',
      colorScheme: 'dark',
      interactiveFx: 'ticker',
      carouselEffect: 'kinetic-snap',
      tickerText: '⚡ MEGA CELEBRATION SALE • 10% OFF ORDERS OVER LKR 5,000 • SAME DAY DISPATCH • LIVE POS STOCK',
    },
    heroCopy: {
      title: 'Big celebrations, bold deals',
      subtitle: 'Wholesale event bundles, volume discounts on balloon bouquets, and flash party packs.',
      ctaLabel: 'Grab sale items',
    },
  },
  {
    id: 'grabber',
    label: 'Grabber Classic',
    description: 'Stone and gold — default luxury retail look.',
    inspiration: 'Grabber POS brand',
    tags: ['default', 'retail'],
    theme: { ...BASE_THEME },
  },
  {
    id: 'spindrift',
    label: 'Spindrift',
    description: 'Cinematic dark navy with aqua highlights — premium lifestyle.',
    inspiration: 'VULK showcase · Spindrift',
    tags: ['dark', 'cinematic', 'luxury'],
    theme: {
      presetId: 'spindrift',
      primaryColor: '#0A1628',
      accentColor: '#22D3EE',
      secondaryColor: '#94A3B8',
      backgroundColor: '#050B14',
      foregroundColor: '#F0F9FF',
      mutedColor: '#0F172A',
      borderColor: '#1E293B',
      onPrimaryColor: '#F0F9FF',
      repairColor: '#14B8A6',
      fontFamily: 'Rubik, Plus Jakarta Sans',
      heroStyle: 'cinematic',
      heroGradient:
        'radial-gradient(ellipse at 20% 0%, rgba(34,211,238,0.18) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(15,23,42,0.9) 0%, transparent 60%), linear-gradient(180deg, #050B14 0%, #0A1628 100%)',
      cardStyle: 'glass',
      colorScheme: 'dark',
    },
    heroCopy: {
      title: 'Discover the collection',
      subtitle: 'Immersive catalog experience — shop live inventory with islandwide COD delivery.',
      ctaLabel: 'Explore products',
    },
  },
  {
    id: 'hearth',
    label: 'Hearth',
    description: 'Warm cream and amber — cozy boutique and home goods.',
    inspiration: 'VULK showcase · Hearth',
    tags: ['light', 'warm', 'boutique'],
    theme: {
      presetId: 'hearth',
      primaryColor: '#292018',
      accentColor: '#D97706',
      secondaryColor: '#78716C',
      backgroundColor: '#FAF6F1',
      foregroundColor: '#1C1410',
      mutedColor: '#F5EDE4',
      borderColor: '#E7DED3',
      onPrimaryColor: '#FFFBEB',
      repairColor: '#B45309',
      fontFamily: 'Nunito Sans, Rubik',
      heroStyle: 'classic',
      heroGradient:
        'linear-gradient(135deg, rgba(217,119,6,0.12) 0%, transparent 50%), radial-gradient(ellipse at 0% 100%, rgba(250,246,241,0.9) 0%, transparent 70%)',
      cardStyle: 'elevated',
      colorScheme: 'light',
    },
    heroCopy: {
      title: 'Welcome home',
      subtitle: 'Handpicked essentials and seasonal favorites — order online, pay on delivery.',
      ctaLabel: 'Shop now',
    },
  },
  {
    id: 'volta',
    label: 'Volta',
    description: 'Electric indigo on deep charcoal — tech and electronics.',
    inspiration: 'VULK showcase · Volta',
    tags: ['dark', 'tech', 'glass'],
    theme: {
      presetId: 'volta',
      primaryColor: '#0F0F1A',
      accentColor: '#6366F1',
      secondaryColor: '#A5B4FC',
      backgroundColor: '#09090F',
      foregroundColor: '#E2E8F0',
      mutedColor: '#151522',
      borderColor: '#27273A',
      onPrimaryColor: '#EEF2FF',
      repairColor: '#818CF8',
      fontFamily: 'Plus Jakarta Sans, Rubik',
      heroStyle: 'glass',
      heroGradient:
        'radial-gradient(ellipse at 50% -20%, rgba(99,102,241,0.25) 0%, transparent 55%), radial-gradient(ellipse at 100% 80%, rgba(129,140,248,0.12) 0%, transparent 45%), linear-gradient(180deg, #09090F 0%, #0F0F1A 100%)',
      cardStyle: 'glass',
      colorScheme: 'dark',
    },
    heroCopy: {
      title: 'Power your setup',
      subtitle: 'Latest devices, accessories, and repair services — synced with live stock.',
      ctaLabel: 'Browse tech',
    },
  },
  {
    id: 'fretboard',
    label: 'Fretboard',
    description: 'Charcoal stage with gold accents — music and lifestyle retail.',
    inspiration: 'VULK showcase · Fretboard',
    tags: ['dark', 'bold'],
    theme: {
      presetId: 'fretboard',
      primaryColor: '#18181B',
      accentColor: '#CA8A04',
      secondaryColor: '#A1A1AA',
      backgroundColor: '#0C0C0E',
      foregroundColor: '#FAFAFA',
      mutedColor: '#18181B',
      borderColor: '#27272A',
      onPrimaryColor: '#FAFAFA',
      repairColor: '#EAB308',
      fontFamily: 'Rubik, Nunito Sans',
      heroStyle: 'bold',
      heroGradient:
        'linear-gradient(125deg, rgba(202,138,4,0.14) 0%, transparent 45%), radial-gradient(circle at 90% 10%, rgba(202,138,4,0.08) 0%, transparent 40%)',
      cardStyle: 'glass',
      colorScheme: 'dark',
    },
    heroCopy: {
      title: 'Play it loud',
      subtitle: 'Gear, parts, and expert repairs — order online or track your service ticket.',
      ctaLabel: 'Shop gear',
    },
  },
  {
    id: 'octaboot',
    label: 'OCTABOOT',
    description: 'High-contrast streetwear — black base with signal red CTAs.',
    inspiration: 'VULK showcase · OCTABOOT',
    tags: ['dark', 'streetwear', 'bold'],
    theme: {
      presetId: 'octaboot',
      primaryColor: '#0A0A0A',
      accentColor: '#DC2626',
      secondaryColor: '#737373',
      backgroundColor: '#111111',
      foregroundColor: '#FAFAFA',
      mutedColor: '#1A1A1A',
      borderColor: '#262626',
      onPrimaryColor: '#FFFFFF',
      repairColor: '#F87171',
      fontFamily: 'Rubik, Plus Jakarta Sans',
      heroStyle: 'bold',
      heroGradient:
        'linear-gradient(160deg, rgba(220,38,38,0.16) 0%, transparent 50%), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 24px)',
      cardStyle: 'flat',
      colorScheme: 'dark',
    },
    heroCopy: {
      title: 'Drop season',
      subtitle: 'Limited runs and core staples — COD checkout, same stock as your POS.',
      ctaLabel: 'View drops',
    },
  },
  {
    id: 'carry-on',
    label: 'T-1 Carry-On',
    description: 'Clean travel minimal — light grey with sky blue accents.',
    inspiration: 'VULK showcase · T-1 Carry-On',
    tags: ['light', 'minimal', 'travel'],
    theme: {
      presetId: 'carry-on',
      primaryColor: '#334155',
      accentColor: '#0284C7',
      secondaryColor: '#64748B',
      backgroundColor: '#F8FAFC',
      foregroundColor: '#0F172A',
      mutedColor: '#E2E8F0',
      borderColor: '#CBD5E1',
      onPrimaryColor: '#FFFFFF',
      repairColor: '#0369A1',
      fontFamily: 'Plus Jakarta Sans, Nunito Sans',
      heroStyle: 'minimal',
      heroGradient:
        'linear-gradient(180deg, rgba(2,132,199,0.06) 0%, transparent 60%), linear-gradient(90deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)',
      cardStyle: 'flat',
      colorScheme: 'light',
    },
    heroCopy: {
      title: 'Pack light, shop smart',
      subtitle: 'Essentials for work and travel — fast catalog search and islandwide delivery.',
      ctaLabel: 'Start browsing',
    },
  },
];

export function getStorefrontThemePreset(id: string): StorefrontThemePreset | undefined {
  return STOREFRONT_THEME_PRESETS.find((p) => p.id === id);
}

export function listStorefrontThemePresets(): StorefrontThemePreset[] {
  return STOREFRONT_THEME_PRESETS;
}

/** Merge preset tokens with saved overrides (whatsapp, manual color tweaks). */
export function resolveStorefrontTheme(theme: StorefrontTheme): StorefrontTheme {
  const presetId = theme.presetId || 'grabber';
  const preset = getStorefrontThemePreset(presetId) ?? getStorefrontThemePreset('grabber')!;
  return {
    ...preset.theme,
    ...theme,
    presetId,
    secondaryColor: theme.secondaryColor ?? preset.theme.secondaryColor,
    backgroundColor: theme.backgroundColor ?? preset.theme.backgroundColor,
    foregroundColor: theme.foregroundColor ?? preset.theme.foregroundColor,
    mutedColor: theme.mutedColor ?? preset.theme.mutedColor,
    borderColor: theme.borderColor ?? preset.theme.borderColor,
    onPrimaryColor: theme.onPrimaryColor ?? preset.theme.onPrimaryColor,
    repairColor: theme.repairColor ?? preset.theme.repairColor,
    heroStyle: theme.heroStyle ?? preset.theme.heroStyle,
    heroGradient: theme.heroGradient ?? preset.theme.heroGradient,
    cardStyle: theme.cardStyle ?? preset.theme.cardStyle,
    colorScheme: theme.colorScheme ?? preset.theme.colorScheme,
    interactiveFx: theme.interactiveFx ?? preset.theme.interactiveFx ?? 'confetti',
    carouselEffect: theme.carouselEffect ?? preset.theme.carouselEffect ?? 'spring-showcase',
    tickerText: theme.tickerText ?? preset.theme.tickerText,
  };
}

/** Apply a preset to config — optionally refresh hero copy from preset defaults. */
export function applyStorefrontThemePreset(
  config: StorefrontConfig,
  presetId: string,
  options?: { updateHeroCopy?: boolean },
): StorefrontConfig {
  const preset = getStorefrontThemePreset(presetId);
  if (!preset) return config;

  const theme: StorefrontTheme = {
    ...preset.theme,
    storeName: config.theme.storeName,
    logoUrl: config.theme.logoUrl,
    whatsappNumber: config.theme.whatsappNumber,
  };

  let blocks = config.blocks;
  if (options?.updateHeroCopy && preset.heroCopy) {
    blocks = config.blocks.map((b) => {
      if (b.type !== 'HERO') return b;
      return {
        ...b,
        title: preset.heroCopy?.title ?? b.title,
        subtitle: preset.heroCopy?.subtitle ?? b.subtitle,
        ctaLabel: preset.heroCopy?.ctaLabel ?? b.ctaLabel,
      };
    });
  }

  return { theme, blocks };
}
