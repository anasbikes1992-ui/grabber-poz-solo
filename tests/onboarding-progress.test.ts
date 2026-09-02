import { describe, it, expect } from 'vitest';
import { PRESET_CATALOGS } from '../src/lib/setup/dynamic-seed';
import { VERTICAL_PRESETS, listVerticalPresets } from '../src/lib/config/vertical-presets';

describe('dynamic seed catalogs', () => {
  it('defines catalog entries for each retail preset', () => {
    for (const id of ['fashion', 'grocery', 'restaurant', 'wholesale', 'electronics', 'hybrid', 'full'] as const) {
      const catalog = PRESET_CATALOGS[id];
      expect(catalog, id).toBeDefined();
      expect(catalog!.length).toBeGreaterThanOrEqual(2);
      for (const item of catalog!) {
        expect(item.sku).toBeTruthy();
        expect(item.slug).toBeTruthy();
        expect(Number(item.sale)).toBeGreaterThan(0);
      }
    }
  });

  it('fashion catalog matches legacy demo SKUs', () => {
    const skus = PRESET_CATALOGS.fashion!.map((p) => p.sku);
    expect(skus).toContain('DEMO-SHIRT-L');
    expect(skus).toContain('DEMO-OXFORD-M');
  });

  it('every vertical preset id is recognized by seed route resolver', () => {
    const ids = listVerticalPresets().map((p) => p.id);
    for (const id of ids) {
      expect(VERTICAL_PRESETS[id]).toBeDefined();
    }
    expect(ids).toContain('mobilerepair');
  });
});

describe('onboarding milestone shape', () => {
  it('exports milestone ids in guided order', async () => {
    const mod = await import('../src/lib/setup/onboarding-milestones');
    expect(typeof mod.getOnboardingProgress).toBe('function');
    expect(typeof mod.markSeedComplete).toBe('function');
    expect(typeof mod.markPresetApplied).toBe('function');
  });
});
