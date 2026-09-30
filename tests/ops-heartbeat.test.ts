import { describe, expect, it } from 'vitest';
import { summarizeHeartbeat, type OpsHeartbeat } from '@/lib/ops/production-heartbeat';

const baseHeartbeat: OpsHeartbeat = {
  generatedAt: '2026-09-30T00:00:00.000Z',
  backup: {
    status: 'OK',
    latestAt: '2026-09-29T23:00:00.000Z',
    ageHours: 1,
    maxAgeHours: 26,
  },
  paymentMismatches: [],
  pendingJobs: 0,
  deadJobs: 0,
  failedWebhooks: 0,
  staleOpenPaidOrders: 0,
  recentJournalEntries: 3,
};

describe('ops heartbeat summary', () => {
  it('passes a clean production heartbeat', () => {
    expect(summarizeHeartbeat(baseHeartbeat)).toEqual({
      ok: true,
      status: 'OK',
      failures: [],
      warnings: [],
    });
  });

  it('fails when no backup has been recorded', () => {
    const summary = summarizeHeartbeat({
      ...baseHeartbeat,
      backup: { status: 'MISSING', latestAt: null, ageHours: null, maxAgeHours: 26 },
    });

    expect(summary.ok).toBe(false);
    expect(summary.status).toBe('FAIL');
    expect(summary.failures).toContain('No backup record exists.');
  });

  it('fails stale backups, payment mismatches, dead jobs, and failed webhooks', () => {
    const summary = summarizeHeartbeat({
      ...baseHeartbeat,
      backup: { status: 'STALE', latestAt: '2026-09-28T00:00:00.000Z', ageHours: 48, maxAgeHours: 26 },
      paymentMismatches: [{
        orderId: 'order_1',
        orderNumber: 'ORD-1',
        paymentStatus: 'PAID',
        grandTotal: 100,
        paidTotal: 90,
        difference: -10,
      }],
      deadJobs: 2,
      failedWebhooks: 1,
    });

    expect(summary.ok).toBe(false);
    expect(summary.status).toBe('FAIL');
    expect(summary.failures).toEqual([
      'Latest backup is 48h old.',
      '1 paid order(s) do not match successful payment totals.',
      '2 dead background job(s).',
      '1 failed webhook event(s).',
    ]);
  });

  it('warns when paid orders still need operational closure', () => {
    const summary = summarizeHeartbeat({
      ...baseHeartbeat,
      staleOpenPaidOrders: 3,
    });

    expect(summary.ok).toBe(true);
    expect(summary.status).toBe('WARN');
    expect(summary.warnings).toEqual(['3 paid order(s) are still draft/confirmed.']);
  });
});
