import type { CSSProperties } from 'react';
import type { StorefrontTheme } from '@/lib/config/storefront-config.shared';
import { resolveStorefrontTheme } from '@/lib/storefront/theme-presets';

/** Map CMS theme → storefront CSS custom properties. */
export function storefrontThemeStyle(theme: StorefrontTheme): CSSProperties {
  const t = resolveStorefrontTheme(theme);
  const repairMuted = t.repairColor ? `${t.repairColor}1A` : 'rgba(15, 118, 110, 0.1)';

  return {
    ['--sf-primary' as string]: t.primaryColor,
    ['--sf-on-primary' as string]: t.onPrimaryColor ?? '#FFFFFF',
    ['--sf-secondary' as string]: t.secondaryColor ?? t.primaryColor,
    ['--sf-accent' as string]: t.accentColor,
    ['--sf-background' as string]: t.backgroundColor ?? '#FAFAF9',
    ['--sf-foreground' as string]: t.foregroundColor ?? t.primaryColor,
    ['--sf-muted' as string]: t.mutedColor ?? '#E8ECF0',
    ['--sf-border' as string]: t.borderColor ?? '#D6D3D1',
    ['--sf-ring' as string]: t.primaryColor,
    ['--sf-repair' as string]: t.repairColor ?? '#0F766E',
    ['--sf-repair-muted' as string]: repairMuted,
    ['--sf-hero-gradient' as string]: t.heroGradient ?? 'none',
    ['--sf-surface' as string]: t.colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
    ['--sf-surface-border' as string]: t.colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)',
    ['--store-primary' as string]: t.primaryColor,
    ['--sf-font-display' as string]: t.fontFamily.split(',')[0]?.trim() || 'Rubik',
    ['--sf-font-body' as string]: t.fontFamily.split(',')[1]?.trim() || 'Nunito Sans',
  };
}

export function storefrontThemeAttrs(theme: StorefrontTheme): Record<string, string> {
  const t = resolveStorefrontTheme(theme);
  return {
    'data-theme-preset': t.presetId ?? 'grabber',
    'data-hero-style': t.heroStyle ?? 'classic',
    'data-card-style': t.cardStyle ?? 'elevated',
    'data-color-scheme': t.colorScheme ?? 'light',
  };
}

export function whatsappHref(number?: string, message?: string) {
  if (!number) return null;
  const digits = number.replace(/\D/g, '');
  if (!digits) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}
