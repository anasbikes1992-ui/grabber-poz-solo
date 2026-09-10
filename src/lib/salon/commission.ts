/**
 * VERT-S03 — Default stylist commission % by specialist label.
 */
export const STYLIST_COMMISSION_DEFAULTS: Record<string, number> = {
  'Senior Stylist': 15,
  Stylist: 12,
  Barber: 12,
  Junior: 8,
};

export function resolveCommissionPct(specialist: string | null | undefined, override?: number | null): number {
  if (override != null && Number.isFinite(Number(override))) {
    return Math.max(0, Math.min(100, Number(override)));
  }
  const key = String(specialist || '').trim();
  if (STYLIST_COMMISSION_DEFAULTS[key] != null) return STYLIST_COMMISSION_DEFAULTS[key];
  return 10;
}

export function computeCommissionAmount(fee: number, pct: number): number {
  return Math.round(Math.max(0, fee) * (Math.max(0, pct) / 100) * 100) / 100;
}
