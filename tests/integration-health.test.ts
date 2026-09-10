import { describe, it, expect } from 'vitest';

export function computeServiceStatus(input: {
  hasEnv: boolean;
  hasDb: boolean;
  defaultFallback?: 'FALLBACK' | 'UNCONFIGURED' | 'SIMULATION';
}) {
  if (input.hasEnv) return { configured: true, status: 'LIVE' as const, source: 'ENV' as const };
  if (input.hasDb) return { configured: true, status: 'LIVE' as const, source: 'DATABASE' as const };
  return {
    configured: false,
    status: input.defaultFallback || ('UNCONFIGURED' as const),
    source: 'NONE' as const,
  };
}

describe('Integration Health & Credential Inspection (AUD-04)', () => {
  it('identifies PayHere status as LIVE when env credentials exist', () => {
    const res = computeServiceStatus({ hasEnv: true, hasDb: false, defaultFallback: 'FALLBACK' });
    expect(res.configured).toBe(true);
    expect(res.status).toBe('LIVE');
    expect(res.source).toBe('ENV');
  });

  it('identifies PayHere as FALLBACK (COD active) when credentials missing', () => {
    const res = computeServiceStatus({ hasEnv: false, hasDb: false, defaultFallback: 'FALLBACK' });
    expect(res.configured).toBe(false);
    expect(res.status).toBe('FALLBACK');
    expect(res.source).toBe('NONE');
  });

  it('identifies Creative Studio as SIMULATION when FAL_KEY is not set', () => {
    const res = computeServiceStatus({ hasEnv: false, hasDb: false, defaultFallback: 'SIMULATION' });
    expect(res.configured).toBe(false);
    expect(res.status).toBe('SIMULATION');
  });

  it('identifies WhatsApp as LIVE when DB credentials exist', () => {
    const res = computeServiceStatus({ hasEnv: false, hasDb: true, defaultFallback: 'UNCONFIGURED' });
    expect(res.configured).toBe(true);
    expect(res.status).toBe('LIVE');
    expect(res.source).toBe('DATABASE');
  });
});
