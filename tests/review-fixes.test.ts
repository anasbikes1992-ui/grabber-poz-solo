import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mergeConfigJson, readConfigJson } from '../src/lib/config/business-settings';
import { utcCalendarDayDiff } from '../src/lib/hire-purchase/arrears';
import { buildPayHereCheckoutPayload } from '../src/lib/payments/payhere-checkout';

describe('mergeConfigJson offline fallback', () => {
  const origUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://invalid:invalid@127.0.0.1:1/nodb';
  });

  afterEach(() => {
    if (origUrl) process.env.DATABASE_URL = origUrl;
    else delete process.env.DATABASE_URL;
    vi.restoreAllMocks();
  });

  it('falls back to memory when DB update fails', async () => {
    const merged = await mergeConfigJson({ reviewFixProbe: 'ok' });
    expect(merged.reviewFixProbe).toBe('ok');
    const again = await readConfigJson();
    expect(again.reviewFixProbe).toBe('ok');
  });
});

describe('hire purchase UTC day diff', () => {
  it('uses calendar days in UTC', () => {
    const due = new Date('2026-01-01T23:00:00.000Z');
    const now = new Date('2026-01-03T01:00:00.000Z');
    expect(utcCalendarDayDiff(due, now)).toBe(2);
  });
});

describe('PayHere hash inputs', () => {
  it('formats amount to two decimals before hash', () => {
    process.env.PAYHERE_MERCHANT_ID = '1211149';
    process.env.PAYHERE_SECRET = 'test_secret';
    process.env.PAYHERE_MODE = 'sandbox';
    const a = buildPayHereCheckoutPayload({ orderNumber: 'WEB-1', amount: 100, itemsDescription: 'x' });
    const b = buildPayHereCheckoutPayload({ orderNumber: 'WEB-1', amount: 100.004, itemsDescription: 'x' });
    expect(a.fields.amount).toBe('100.00');
    expect(b.fields.amount).toBe('100.00');
  });
});
