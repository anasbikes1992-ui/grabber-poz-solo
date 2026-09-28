import { describe, expect, it } from 'vitest';
import {
  buildCommunicationIdempotencyKey,
  buildDailyOwnerSummary,
  buildReceiptMessage,
  buildReviewRequestMessage,
  calculateCustomerMetrics,
} from '@/lib/customers/communication-pack';

describe('customer communication pack', () => {
  it('builds stable idempotency keys for retry-safe sends', () => {
    expect(buildCommunicationIdempotencyKey('ORDER_RECEIPT', 'ord_123')).toBe('order_receipt:ord_123');
    expect(buildCommunicationIdempotencyKey('DAILY_OWNER_SUMMARY', 'owner', '2026-09-29')).toBe(
      'daily_owner_summary:owner:2026-09-29',
    );
  });

  it('renders receipts without exposing internal implementation details', () => {
    const msg = buildReceiptMessage({
      storeName: 'Grabber Demo',
      orderNumber: 'ORD-1001',
      customerName: 'Anas',
      grandTotal: '12500.5',
      trackingUrl: 'https://grabberpoz.com/track/abc',
    });

    expect(msg).toContain('Hi Anas');
    expect(msg).toContain('Receipt ORD-1001');
    expect(msg).toContain('LKR 12,500.50');
    expect(msg).toContain('https://grabberpoz.com/track/abc');
    expect(msg).not.toMatch(/stack|database|sql/i);
  });

  it('renders post-delivery review requests with the public review URL', () => {
    const msg = buildReviewRequestMessage({
      storeName: 'ThePartyStore',
      orderNumber: 'TPS-55',
      customerName: null,
      reviewUrl: 'https://thepartystore.lk/shop/reviews?order=TPS-55',
    });

    expect(msg).toContain('Hi there');
    expect(msg).toContain('TPS-55');
    expect(msg).toContain('/shop/reviews');
  });

  it('calculates customer lifetime metrics from paid/order history shape', () => {
    const metrics = calculateCustomerMetrics([
      { id: 'old', grandTotal: '1000.00', createdAt: '2026-09-01T00:00:00Z', channel: 'POS' },
      { id: 'new', grandTotal: '2500.50', createdAt: '2026-09-29T00:00:00Z', channel: 'STOREFRONT' },
    ]);

    expect(metrics.lifetimeSpend).toBe('3500.50');
    expect(metrics.orderCount).toBe(2);
    expect(metrics.lastOrderId).toBe('new');
    expect(metrics.lastChannel).toBe('STOREFRONT');
  });

  it('renders daily owner summary as a concise owner digest', () => {
    const msg = buildDailyOwnerSummary({
      storeName: 'Grabber.LK',
      dateLabel: '2026-09-29',
      ordersCount: 7,
      salesTotal: '42000',
      pendingDispatch: 2,
      pendingCod: 3,
      failedJobs: 1,
    });

    expect(msg).toContain('Grabber.LK daily summary');
    expect(msg).toContain('LKR 42,000.00');
    expect(msg).toContain('Pending dispatch: 2');
    expect(msg).toContain('Dead/retry jobs needing attention: 1');
  });
});
