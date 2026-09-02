import { describe, it, expect } from 'vitest';
import { VERTICAL_PRESETS, listVerticalPresets } from '../src/lib/config/vertical-presets';

describe('vertical business presets', () => {
  it('defines hybrid preset for multi-category merchants', () => {
    expect(VERTICAL_PRESETS.hybrid.flags.repairs).toBe(true);
    expect(VERTICAL_PRESETS.hybrid.flags.wholesale).toBe(true);
    expect(VERTICAL_PRESETS.hybrid.posModes).toContain('REPAIR_INTAKE');
    expect(VERTICAL_PRESETS.hybrid.posModes).toContain('WHOLESALE_QUOTE');
  });

  it('maps electronics to IMEI + repair + HP modules', () => {
    const e = VERTICAL_PRESETS.electronics;
    expect(e.flags.repairs).toBe(true);
    expect(e.flags.hirePurchase).toBe(true);
    expect(e.itemTypes).toContain('SERIALIZED');
    expect(e.itemTypes).toContain('PART');
  });

  it('enables grocery module only for FMCG preset', () => {
    expect(VERTICAL_PRESETS.grocery.flags.grocery).toBe(true);
    expect(VERTICAL_PRESETS.fashion.flags.grocery).toBe(false);
  });

  it('lists all business nature presets', () => {
    const ids = listVerticalPresets().map((p) => p.id);
    expect(ids).toContain('restaurant');
    expect(ids).toContain('wholesale');
    expect(ids.length).toBeGreaterThanOrEqual(6);
  });
});
