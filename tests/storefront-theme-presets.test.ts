import { describe, it, expect } from 'vitest';
import { DEFAULT_STOREFRONT } from '../src/lib/config/storefront-config.shared';
import {
  applyStorefrontThemePreset,
  getStorefrontThemePreset,
  listStorefrontThemePresets,
  resolveStorefrontTheme,
} from '../src/lib/storefront/theme-presets';
import { storefrontThemeStyle, storefrontThemeAttrs } from '../src/lib/storefront/theme-vars';

describe('storefront theme presets', () => {
  it('lists VULK-inspired presets including grabber default', () => {
    const ids = listStorefrontThemePresets().map((p) => p.id);
    expect(ids).toContain('grabber');
    expect(ids).toContain('spindrift');
    expect(ids).toContain('volta');
    expect(ids.length).toBeGreaterThanOrEqual(6);
  });

  it('resolves full CSS token set from preset id', () => {
    const resolved = resolveStorefrontTheme({ presetId: 'spindrift', primaryColor: '#1C1917', accentColor: '#A16207', fontFamily: 'Rubik' });
    expect(resolved.colorScheme).toBe('dark');
    expect(resolved.heroStyle).toBe('cinematic');
    expect(resolved.backgroundColor).toMatch(/^#/);
    expect(resolved.heroGradient).toContain('gradient');
  });

  it('maps theme to storefront CSS variables', () => {
    const style = storefrontThemeStyle(resolveStorefrontTheme(getStorefrontThemePreset('hearth')!.theme)) as Record<string, string>;
    expect(style['--sf-accent']).toBe('#D97706');
    expect(style['--sf-background']).toBe('#FAF6F1');
    expect(style['--sf-hero-gradient']).toContain('gradient');
  });

  it('sets data attributes for hero and card styles', () => {
    const attrs = storefrontThemeAttrs(getStorefrontThemePreset('octaboot')!.theme);
    expect(attrs['data-theme-preset']).toBe('octaboot');
    expect(attrs['data-hero-style']).toBe('bold');
    expect(attrs['data-color-scheme']).toBe('dark');
  });

  it('applies preset while keeping whatsapp number', () => {
    const base = {
      ...DEFAULT_STOREFRONT,
      theme: { ...DEFAULT_STOREFRONT.theme, whatsappNumber: '94771234567' },
    };
    const next = applyStorefrontThemePreset(base, 'volta');
    expect(next.theme.presetId).toBe('volta');
    expect(next.theme.accentColor).toBe('#6366F1');
    expect(next.theme.whatsappNumber).toBe('94771234567');
  });

  it('can refresh hero copy from preset', () => {
    const next = applyStorefrontThemePreset(DEFAULT_STOREFRONT, 'carry-on', { updateHeroCopy: true });
    const hero = next.blocks.find((b) => b.type === 'HERO');
    expect(hero?.type === 'HERO' && hero.title).toBe('Pack light, shop smart');
  });
});
