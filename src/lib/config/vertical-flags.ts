/**
 * Vertical feature flags — shared client helper.
 */
export type VerticalFlags = {
  repairs: boolean;
  restaurant: boolean;
  hirePurchase: boolean;
  appointments: boolean;
  loyalty: boolean;
  wholesale: boolean;
  whatsapp: boolean;
  creative: boolean;
};

export const DEFAULT_VERTICAL_FLAGS: VerticalFlags = {
  repairs: true,
  restaurant: true,
  hirePurchase: true,
  appointments: true,
  loyalty: true,
  wholesale: true,
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
