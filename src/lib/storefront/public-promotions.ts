'use client';

/**
 * Deduped public promotions fetch — shared by PromotionPopup + ProductPromoBadge path.
 */

export type PublicPromo = {
  id: string;
  name: string;
  promoCode?: string;
  isAutomatic?: boolean;
  discountType: 'PERCENT' | 'FIXED' | string;
  discountValue: number;
  endsAt?: string;
  display?: {
    popupTitle?: string;
    popupMessage?: string;
    popupCtaText?: string;
    popupCtaUrl?: string;
    countdownEnabled?: boolean;
    announcementEnabled?: boolean;
    bannerEnabled?: boolean;
    popupEnabled?: boolean;
  };
};

let cache: { at: number; promos: PublicPromo[] } | null = null;
let inflight: Promise<PublicPromo[]> | null = null;
const TTL_MS = 60_000;

export async function loadPublicPromotions(opts?: { force?: boolean }): Promise<PublicPromo[]> {
  if (!opts?.force && cache && Date.now() - cache.at < TTL_MS) return cache.promos;
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch('/api/promotions/public');
        if (!res.ok) {
          cache = { at: Date.now(), promos: [] };
          return [];
        }
        const data = (await res.json()) as { success?: boolean; promotions?: PublicPromo[] };
        const promos = data.success && Array.isArray(data.promotions) ? data.promotions : [];
        cache = { at: Date.now(), promos };
        return promos;
      } catch {
        cache = { at: Date.now(), promos: [] };
        return [];
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

/** Best automatic / banner promo for product-card badges. */
export function pickCatalogBadgePromo(promos: PublicPromo[]): PublicPromo | null {
  return (
    promos.find((p) => p.isAutomatic || p.display?.bannerEnabled) ||
    promos.find((p) => p.display?.announcementEnabled) ||
    promos[0] ||
    null
  );
}
