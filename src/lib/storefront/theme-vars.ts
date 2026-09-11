import type { CSSProperties } from 'react';
import type { StorefrontTheme } from '@/lib/config/storefront-config.shared';
import { resolveStorefrontTheme } from '@/lib/storefront/theme-presets';

/** Relative luminance 0–1 for hex (#RGB / #RRGGBB). */
function hexLuminance(hex: string): number {
  const raw = hex.replace('#', '').trim();
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (full.length < 6) return 0.5;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Text color that contrasts with a fill (WCAG-ish heuristic). */
export function contrastOnColor(fillHex: string): string {
  return hexLuminance(fillHex) > 0.45 ? '#0A0A0A' : '#FFFFFF';
}

/** Map CMS theme → storefront CSS custom properties. */
export function storefrontThemeStyle(theme: StorefrontTheme): CSSProperties {
  const t = resolveStorefrontTheme(theme);
  const repairMuted = t.repairColor ? `${t.repairColor}1A` : 'rgba(15, 118, 110, 0.1)';
  const isDark = t.colorScheme === 'dark';
  const fg = t.foregroundColor ?? t.primaryColor;
  const accent = t.accentColor;
  const onAccent = contrastOnColor(accent);
  // Focus ring must be visible on background — never use dark primary on dark bg
  const ring = isDark ? accent : fg;
  // Text/icon color for translucent --sf-surface panels. On dark schemes the
  // surface sits over a dark background, so primary (a fill color) is unreadable.
  const onSurface = isDark ? (t.foregroundColor ?? '#F5F5F4') : fg;

  return {
    ['--sf-primary' as string]: t.primaryColor,
    ['--sf-on-primary' as string]: t.onPrimaryColor ?? '#FFFFFF',
    ['--sf-secondary' as string]: t.secondaryColor ?? t.primaryColor,
    ['--sf-accent' as string]: accent,
    ['--sf-on-accent' as string]: onAccent,
    ['--sf-background' as string]: t.backgroundColor ?? '#FAFAF9',
    ['--sf-foreground' as string]: fg,
    ['--sf-muted' as string]: t.mutedColor ?? '#E8ECF0',
    ['--sf-border' as string]: t.borderColor ?? '#D6D3D1',
    ['--sf-ring' as string]: ring,
    ['--sf-repair' as string]: t.repairColor ?? '#0F766E',
    ['--sf-repair-muted' as string]: repairMuted,
    ['--sf-hero-gradient' as string]: t.heroGradient ?? 'none',
    ['--sf-surface' as string]: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
    ['--sf-surface-border' as string]: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)',
    ['--sf-on-surface' as string]: onSurface,
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
