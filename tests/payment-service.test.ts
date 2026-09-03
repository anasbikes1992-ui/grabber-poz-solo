/**
 * GRABBER BUSINESS OS — PAYMENT SERVICE TESTS
 * Tests orchestrator routing, registry, channel filtering, and amount verification
 */

import { describe, it, expect } from 'vitest';
import { PaymentService, defaultPaymentService } from '../src/lib/payments/payment-service';
import { PaymentError, PaymentConfigurationError } from '../src/lib/payments/payment-errors';

describe('M4: PaymentService Orchestrator', () => {
  it('registers all 6 canonical payment gateways by default', () => {
    const service = new PaymentService();
    expect(service.getGateway('COD').id).toBe('COD');
    expect(service.getGateway('PAYHERE').id).toBe('PAYHERE');
    expect(service.getGateway('WEBXPAY').id).toBe('WEBXPAY');
    expect(service.getGateway('KOKO').id).toBe('KOKO');
    expect(service.getGateway('MINTPAY').id).toBe('MINTPAY');
    expect(service.getGateway('PAYZY').id).toBe('PAYZY');
  });

  it('throws PaymentConfigurationError when requesting unregistered gateway', () => {
    const service = new PaymentService();
    expect(() => service.getGateway('NON_EXISTENT' as any)).toThrow(PaymentConfigurationError);
  });

  it('filters available gateways accurately by channel (POS vs Storefront)', () => {
    const service = defaultPaymentService;

    // Storefront query
    const storefrontGateways = service.getAvailableGateways({ channel: 'STOREFRONT' });
    const sfIds = storefrontGateways.map((g) => g.id);
    expect(sfIds).toContain('COD');
    expect(sfIds).toContain('PAYHERE');
    expect(sfIds).toContain('WEBXPAY');
    expect(sfIds).toContain('KOKO');
    expect(sfIds).toContain('MINTPAY');
    expect(sfIds).toContain('PAYZY');

    // POS query (only COD, Koko, Mintpay declare in-store POS capability)
    const posGateways = service.getAvailableGateways({ channel: 'POS' });
    const posAvailable = posGateways.filter((g) => g.isAvailable).map((g) => g.id);
    expect(posAvailable).toContain('COD');
  });

  it('rejects payment creation with non-positive or invalid amounts', async () => {
    const service = defaultPaymentService;

    await expect(
      service.createPayment('COD', {
        orderId: 'ord_bad_amt',
        orderNumber: 'POS-BAD-1',
        amount: 0,
        currency: 'LKR',
        itemsDescription: 'Zero amount order',
        channel: 'POS',
      }),
    ).rejects.toThrow(PaymentError);

    await expect(
      service.createPayment('COD', {
        orderId: 'ord_bad_amt2',
        orderNumber: 'POS-BAD-2',
        amount: -500,
        currency: 'LKR',
        itemsDescription: 'Negative amount order',
        channel: 'POS',
      }),
    ).rejects.toThrow(PaymentError);
  });

  it('routes verified callback through orchestrator to produce canonical lifecycle result', async () => {
    const service = defaultPaymentService;

    const callbackInput = {
      callbackData: {
        headers: {},
        body: {
          orderNumber: 'STORE-12345',
          amount: 25000,
          delivered: true,
        },
      },
      expectedAmount: 25000,
      orderId: 'ord_12345',
    };

    const res = await service.processCallback('COD', callbackInput);
    expect(res.success).toBe(true);
    expect(res.status).toBe('CAPTURED');
    expect(res.capturedAmount).toBe(25000);
    expect(res.settled).toBe(true);
  });
});
