'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  invalidateShopperSessionCache,
  loadShopperSession,
  type ShopperSession,
} from '@/lib/storefront/shopper-session';

export function useShopperSession() {
  const [shopper, setShopper] = useState<ShopperSession | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async (force = false) => {
    const next = await loadShopperSession({ force });
    setShopper(next);
    setReady(true);
    return next;
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/shopper', { method: 'DELETE' });
    invalidateShopperSessionCache();
    setShopper(null);
  }, []);

  return { shopper, ready, refresh, signOut };
}
