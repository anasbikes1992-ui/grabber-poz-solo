/** Uppercase OEM / part codes and strip spaces, dashes, underscores. */
export function normalizeOemCode(s: string): string {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]/g, '');
}

export function validateYearRange(from: number | null | undefined, to: number | null | undefined): boolean {
  if (from == null && to == null) return true;
  if (from != null && (!Number.isFinite(from) || from < 1900 || from > 2100)) return false;
  if (to != null && (!Number.isFinite(to) || to < 1900 || to > 2100)) return false;
  if (from != null && to != null && from > to) return false;
  return true;
}

export function assertValidYearRange(from: number | null | undefined, to: number | null | undefined): void {
  if (!validateYearRange(from, to)) {
    throw new Error(`Invalid year range: ${from ?? '—'}–${to ?? '—'}`);
  }
}
