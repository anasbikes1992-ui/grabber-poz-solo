import type { CSSProperties } from 'react';
import type { StorefrontTheme } from '@/lib/config/storefront-config';

/** Map CMS theme → storefront CSS custom properties (stone/gold defaults as fallback). */
export function storefrontThemeStyle(theme: StorefrontTheme): CSSProperties {
  return {
    ['--sf-primary' as string]: theme.primaryColor,
    ['--sf-accent' as string]: theme.accentColor,
    ['--sf-foreground' as string]: theme.primaryColor,
    ['--store-primary' as string]: theme.primaryColor,
    ['--sf-font-display' as string]: theme.fontFamily.split(',')[0]?.trim() || 'Rubik',
    ['--sf-font-body' as string]: theme.fontFamily.split(',')[1]?.trim() || 'Nunito Sans',
  };
}

export function whatsappHref(number?: string, message?: string) {
  if (!number) return null;
  const digits = number.replace(/\D/g, '');
  if (!digits) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}
