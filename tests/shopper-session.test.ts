import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  invalidateShopperSessionCache,
  loadShopperSession,
} from '@/lib/storefront/shopper-session';

describe('loadShopperSession', () => {
  afterEach(() => {
    invalidateShopperSessionCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('dedupes concurrent fetches into one network call', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        authenticated: true,
        customer: { id: '1', name: 'Ada', phone: null, email: null },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([loadShopperSession(), loadShopperSession()]);
    expect(a?.name).toBe('Ada');
    expect(b?.name).toBe('Ada');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves TTL cache on second call', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ authenticated: false }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await loadShopperSession();
    await loadShopperSession();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
