'use client';

/**
 * Deduped shopper session loader — StorefrontShell + StorefrontHome share one network call.
 */

export type ShopperSession = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type CacheRow = { shopper: ShopperSession | null; at: number };

let cache: CacheRow | null = null;
let inflight: Promise<ShopperSession | null> | null = null;
const TTL_MS = 60_000;

export function invalidateShopperSessionCache() {
  cache = null;
  inflight = null;
}

export async function loadShopperSession(opts?: { force?: boolean }): Promise<ShopperSession | null> {
  if (!opts?.force && cache && Date.now() - cache.at < TTL_MS) {
    return cache.shopper;
  }
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch('/api/auth/shopper');
        const data = (await res.json()) as {
          authenticated?: boolean;
          customer?: ShopperSession;
        };
        const shopper = data.authenticated && data.customer ? data.customer : null;
        cache = { shopper, at: Date.now() };
        return shopper;
      } catch {
        cache = { shopper: null, at: Date.now() };
        return null;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}
