import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../src/lib/security/rate-limit';

describe('rate limit', () => {
  it('allows requests under the limit', () => {
    const key = `test-allow-${Date.now()}`;
    expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
  });

  it('blocks when limit exceeded', () => {
    const key = `test-block-${Date.now()}`;
    for (let i = 0; i < 2; i++) {
      expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    }
    const blocked = checkRateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });
});
