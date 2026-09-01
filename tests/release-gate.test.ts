import { describe, it, expect } from 'vitest';
import { completedOrderFilter, startOfToday, sumOrderRevenue } from '../src/lib/commerce/sales-metrics';

describe('release-gate sales metrics SSOT', () => {
  it('startOfToday resets to local midnight', () => {
    const d = startOfToday();
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('sumOrderRevenue handles null and string totals', () => {
    expect(sumOrderRevenue([{ grandTotal: '100' }, { grandTotal: 50 }, { grandTotal: null }])).toBe(150);
  });

  it('completedOrderFilter is a SQL fragment (used by dashboard + Jarvis)', () => {
    const filter = completedOrderFilter(startOfToday());
    expect(filter).toBeTruthy();
  });
});

describe('release-gate order lifecycle', () => {
  it('storefront COD starts confirmed with pending payment', async () => {
    const { resolveCheckoutStatuses } = await import('../src/lib/commerce/order-lifecycle');
    const s = resolveCheckoutStatuses('STOREFRONT', 'COD');
    expect(s.orderStatus).toBe('CONFIRMED');
    expect(s.paymentStatus).toBe('PENDING');
    expect(s.decrementStock).toBe(true);
  });

  it('POS cash completes immediately', async () => {
    const { resolveCheckoutStatuses } = await import('../src/lib/commerce/order-lifecycle');
    const s = resolveCheckoutStatuses('POS', 'CASH');
    expect(s.orderStatus).toBe('DELIVERED');
    expect(s.paymentStatus).toBe('PAID');
  });
});
