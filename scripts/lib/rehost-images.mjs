/** Pure helpers for scripts/rehost-product-images.mjs (unit-tested). */

const OWN_HOST_SUFFIXES = ['.supabase.co', '.supabase.in', '.grabberpoz.com'];
export const IMAGE_ATTR_KEYS = ['imageUrl', 'image', 'image_url', 'img', 'featured_image', 'thumbnail'];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** True when the URL points at a host we do not control (and so can break at any time). */
export function isExternalImageUrl(url, extraOwnHosts = [], rehostHosts = []) {
  if (!url || typeof url !== 'string') return false;
  const value = url.trim();
  if (!value || value.startsWith('/') || value.startsWith('data:')) return false;
  let host;
  try {
    host = new URL(value).hostname.toLowerCase();
  } catch {
    return false;
  }
  // Hosts we were asked to move (e.g. the old Supabase project) count as external even though
  // they would normally be treated as ours.
  if (rehostHosts.some((h) => host === h.toLowerCase())) return true;
  const own = [...OWN_HOST_SUFFIXES, ...extraOwnHosts.map((h) => h.toLowerCase())];
  return !own.some((suffix) => host === suffix.replace(/^\./, '') || host.endsWith(suffix.startsWith('.') ? suffix : `.${suffix}`));
}

const SIGNATURES = [
  { ext: 'jpg', mime: 'image/jpeg', sig: [0xff, 0xd8, 0xff] },
  { ext: 'png', mime: 'image/png', sig: [0x89, 0x50, 0x4e, 0x47] },
  { ext: 'webp', mime: 'image/webp', sig: [0x52, 0x49, 0x46, 0x46] },
  { ext: 'gif', mime: 'image/gif', sig: [0x47, 0x49, 0x46, 0x38] },
];

/** Identify an image by its magic bytes (never trust the URL or Content-Type). */
export function sniffImage(bytes) {
  for (const s of SIGNATURES) {
    if (s.sig.every((v, i) => bytes[i] === v)) return { ext: s.ext, mime: s.mime };
  }
  return null;
}

/** Collect external image URLs from a variant's attributes JSON. */
export function externalAttrImages(attributes, extraOwnHosts = [], rehostHosts = []) {
  const out = [];
  if (!attributes || typeof attributes !== 'object') return out;
  for (const key of IMAGE_ATTR_KEYS) {
    const v = attributes[key];
    if (typeof v === 'string' && isExternalImageUrl(v, extraOwnHosts, rehostHosts)) out.push({ key, url: v });
  }
  return out;
}

/** Summarise per-URL outcomes for the report. */
export function summarize(results) {
  const counts = { rehosted: 0, dead: 0, invalid: 0, skipped: 0, planned: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  return counts;
}
