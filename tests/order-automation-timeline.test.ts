import { describe, expect, it } from 'vitest';
import {
  buildOrderAutomationTimeline,
  summarizeOrderAutomationTimeline,
} from '../src/lib/orders/automation-timeline';

const baseOrder = {
  orderId: 'order-1',
  orderNumber: 'ORD-1001',
  channel: 'STOREFRONT',
  orderStatus: 'CONFIRMED',
  paymentStatus: 'PAID',
  fulfillmentStatus: 'PENDING',
  grandTotal: 6498,
  lineCount: 2,
  customerName: 'Anaz',
  customerPhone: '0771350035',
  customerAddress: 'Colombo',
  paymentMethods: ['CARD'],
};

describe('order automation timeline', () => {
  it('marks order, invoice, stock, and ledger steps as done for a paid order', () => {
    const steps = buildOrderAutomationTimeline(baseOrder);
    const byKey = new Map(steps.map((step) => [step.key, step]));

    expect(byKey.get('order_created')?.status).toBe('done');
    expect(byKey.get('invoice_ready')?.status).toBe('done');
    expect(byKey.get('stock_posted')?.status).toBe('done');
    expect(byKey.get('ledger_posted')?.status).toBe('done');
    expect(byKey.get('receipt_send')?.status).toBe('ready');
    expect(byKey.get('delivery_dispatch')?.status).toBe('ready');
    expect(byKey.get('review_request')?.status).toBe('pending');
  });

  it('blocks delivery and receipt when customer contact details are missing', () => {
    const steps = buildOrderAutomationTimeline({
      ...baseOrder,
      customerPhone: '',
      customerAddress: '',
    });
    const byKey = new Map(steps.map((step) => [step.key, step]));

    expect(byKey.get('receipt_send')?.status).toBe('blocked');
    expect(byKey.get('delivery_dispatch')?.status).toBe('blocked');
  });

  it('overlays persisted failed events without changing the derived checklist shape', () => {
    const steps = buildOrderAutomationTimeline(baseOrder, [
      {
        eventKey: 'receipt_send',
        label: 'Receipt message',
        status: 'FAILED',
        detail: { error: 'Provider unavailable' },
      },
    ]);
    const summary = summarizeOrderAutomationTimeline(steps);

    expect(steps).toHaveLength(9);
    expect(steps.find((step) => step.key === 'receipt_send')?.status).toBe('failed');
    expect(summary.failed).toBe(1);
  });
});
