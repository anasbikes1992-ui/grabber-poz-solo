/**
 * Vertical feature flags — shared client helper.
 * Presets live in vertical-presets.ts; Polim Potha ledger is always on (core).
 */
import type { VerticalFlags as PresetVerticalFlags } from '@/lib/config/vertical-presets';

export type VerticalFlags = PresetVerticalFlags;

/** Conservative retail defaults when API unavailable (not demo-all-on). */
export const DEFAULT_VERTICAL_FLAGS: VerticalFlags = {
  repairs: false,
  restaurant: false,
  hirePurchase: false,
  appointments: false,
  loyalty: true,
  wholesale: false,
  grocery: false,
  whatsapp: true,
  creative: true,
};

export async function fetchVerticalFlags(): Promise<VerticalFlags> {
  try {
    const res = await fetch('/api/config/flags');
    const data = await res.json();
    if (data.success && data.flags) {
      return { ...DEFAULT_VERTICAL_FLAGS, ...data.flags };
    }
  } catch {
    /* offline */
  }
  return DEFAULT_VERTICAL_FLAGS;
}
