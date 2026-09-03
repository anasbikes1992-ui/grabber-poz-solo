/**
 * GRABBER BUSINESS OS — PAYMENT GATEWAY CONTRACT TESTS
 * Verifies uniform contract compliance across COD, PayHere, WebXPay, Koko, Mintpay, and Payzy.
 */

import { describe, it, expect } from 'vitest';
import { CodGateway } from '../src/lib/payments/cod';
import { PayHereGateway } from '../src/lib/payments/payhere';
import { WebXPayGateway } from '../src/lib/payments/webxpay';
import { KokoGateway } from '../src/lib/payments/koko';
import { MintpayGateway } from '../src/lib/payments/mintpay';
import { PayzyGateway } from '../src/lib/payments/payzy';
import type { PaymentGateway } from '../src/lib/payments/payment-gateway';
import type { CreatePaymentInput } from '../src/lib/payments/payment-types';
import { PaymentAmountMismatchError } from '../src/lib/payments/payment-errors';
import { generatePayHereCheckoutPayload } from '../src/lib/payments/payhere/client';

describe('M4: Common Payment Gateway Contract Compliance', () => {
  const gateways: PaymentGateway[] = [
    new CodGateway(),
    new PayHereGateway(),
    new WebXPayGateway(),
    new KokoGateway(),
    new MintpayGateway(),
    new PayzyGateway(),
  ];

  it('all 6 gateways implement correct PaymentGateway interface and unique IDs', () => {
    const ids = gateways.map((g) => g.id);
    expect(ids).toEqual(['COD', 'PAYHERE', 'WEBXPAY', 'KOKO', 'MINTPAY', 'PAYZY']);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(6);
  });

  it('all 6 gateways declare explicit capability contracts without falsified claims', () => {
    for (const gw of gateways) {
      const caps = gw.capabilities();
      expect(typeof caps.supportsOnlinePayment).toBe('boolean');
      expect(typeof caps.supportsRedirect).toBe('boolean');
      expect(typeof caps.supportsCallback).toBe('boolean');
      expect(typeof caps.supportsRefund).toBe('boolean');
      expect(typeof caps.supportsCancel).toBe('boolean');
      expect(typeof caps.supportsCOD).toBe('boolean');
      expect(typeof caps.supportsPOS).toBe('boolean');
      expect(typeof caps.supportsStorefront).toBe('boolean');
      expect(Array.isArray(caps.supportedCurrencies)).toBe(true);
      expect(caps.supportedCurrencies).toContain('LKR');
    }
  });

  it('COD gateway behaves natively: POS cash captured immediately, storefront COD pending', async () => {
    const cod = new CodGateway();
    expect(cod.isConfigured()).toBe(true);

    const posInput: CreatePaymentInput = {
      orderId: 'ord_pos_1',
      orderNumber: 'POS-COD-1',
      amount: 5000,
      currency: 'LKR',
      itemsDescription: 'POS counter sale',
      channel: 'POS',
    };
    const posRes = await cod.createPayment(posInput);
    expect(posRes.status).toBe('CAPTURED');

    const storeInput: CreatePaymentInput = {
      orderId: 'ord_store_1',
      orderNumber: 'STORE-COD-1',
      amount: 12000,
      currency: 'LKR',
      itemsDescription: 'Online COD order',
      channel: 'STOREFRONT',
    };
    const storeRes = await cod.createPayment(storeInput);
    expect(storeRes.status).toBe('PENDING');
  });

  it('online gateways reject callbacks with amount mismatches against authoritative order total', async () => {
    const onlineGateways: PaymentGateway[] = [
      new PayHereGateway(),
      new WebXPayGateway(),
      new KokoGateway(),
      new MintpayGateway(),
      new PayzyGateway(),
    ];

    for (const gw of onlineGateways) {
      const fakeEvent = {
        isValid: true,
        gatewayId: gw.id,
        orderNumber: 'ORD-TEST-99',
        providerReference: `ref_${gw.id}_99`,
        amount: 5000, // Provider claims 5000 LKR
        currency: 'LKR',
        status: 'CAPTURED' as const,
        signatureVerified: true,
      };

      // Authoritative expected amount is 7500 LKR
      await expect(
        gw.handleCallback({
          event: fakeEvent,
          expectedAmount: 7500,
          orderId: 'ord_99',
        }),
      ).rejects.toThrow(PaymentAmountMismatchError);
    }
  });

  it('online gateways map matching captured events cleanly to canonical payment lifecycle', async () => {
    const onlineGateways: PaymentGateway[] = [
      new PayHereGateway(),
      new WebXPayGateway(),
      new KokoGateway(),
      new MintpayGateway(),
      new PayzyGateway(),
    ];

    for (const gw of onlineGateways) {
      const validEvent = {
        isValid: true,
        gatewayId: gw.id,
        orderNumber: 'ORD-CORRECT-100',
        providerReference: `ref_${gw.id}_100`,
        amount: 15000,
        currency: 'LKR',
        status: 'CAPTURED' as const,
        signatureVerified: true,
      };

      const res = await gw.handleCallback({
        event: validEvent,
        expectedAmount: 15000,
        orderId: 'ord_100',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('CAPTURED');
      expect(res.capturedAmount).toBe(15000);
      expect(res.settled).toBe(true);
    }
  });

  it('PayHere payload generator produces valid MD5 hash and supports Recurring API parameters', () => {
    const config = {
      merchantId: '1234723',
      secret: 'MTMyMzAxMzE3MjI2MDAxNDQ1MzMzMDUwMzg5NjEyOTkyOT',
      mode: 'sandbox' as const,
      returnUrl: 'http://localhost:3000/shop/checkout?paid=1',
      cancelUrl: 'http://localhost:3000/shop/checkout?cancelled=1',
      notifyUrl: 'http://localhost:3000/api/webhooks/payhere',
    };

    // 1. One-time Checkout API test
    const oneTime = generatePayHereCheckoutPayload(
      {
        orderNumber: 'ORD-PH-101',
        amount: 2500,
        itemsDescription: 'T-Shirt',
        customerName: 'Kamal Perera',
        customerEmail: 'kamal@example.com',
      },
      config,
    );

    expect(oneTime.checkoutUrl).toBe('https://sandbox.payhere.lk/pay/checkout');
    expect(oneTime.fields.merchant_id).toBe('1234723');
    expect(oneTime.fields.amount).toBe('2500.00');
    expect(oneTime.fields.hash).toBeDefined();
    expect(oneTime.fields.hash.length).toBe(32); // MD5 hex length

    // 2. Recurring API test (Subscriptions)
    const recurring = generatePayHereCheckoutPayload(
      {
        orderNumber: 'SUB-PH-202',
        amount: 5000,
        itemsDescription: 'Monthly Cloud Service',
        recurrence: '1 Month',
        duration: 'Forever',
      },
      config,
    );

    expect(recurring.fields.recurrence).toBe('1 Month');
    expect(recurring.fields.duration).toBe('Forever');
    expect(recurring.fields.hash).toBeDefined();
  });

  it('PayHere refund handles missing API credentials gracefully with informative error', async () => {
    const payhere = new PayHereGateway();
    const refundRes = await payhere.refund({
      orderId: 'ord_ref_test',
      orderNumber: 'ORD-REF-01',
      currency: 'LKR',
      providerReference: '320027150501',
      refundAmount: 2500,
      reason: 'Customer return',
    });

    expect(refundRes.success).toBe(false);
    expect(refundRes.status).toBe('FAILED');
    expect(refundRes.error).toMatch(/PayHere Automated Refund requires PAYHERE_APP_ID/i);
  });
});
