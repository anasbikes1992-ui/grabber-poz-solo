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
