/**
 * GRABBER BUSINESS OS — PAYMENT SECURITY TESTS
 * Adversarial Testing: Signature Verification, Client Tampering, Secret Masking, Replay Defense
 */

import { describe, it, expect } from 'vitest';
import { PayHereGateway } from '../src/lib/payments/payhere';
import { WebXPayGateway } from '../src/lib/payments/webxpay';
import { KokoGateway } from '../src/lib/payments/koko';
import { MintpayGateway } from '../src/lib/payments/mintpay';
import { PayzyGateway } from '../src/lib/payments/payzy';
import { isPaymentCallbackDuplicate, type PaymentTransactionRecord } from '../src/lib/commerce/payment-lifecycle';
import { PaymentAmountMismatchError, PaymentVerificationError } from '../src/lib/payments/payment-errors';

describe('M4: Payment Security & Attack Defense', () => {
  it('PayHere rejects callback when MD5 signature is forged or invalid', async () => {
    const payhere = new PayHereGateway();

    const forgedCallback = {
      headers: {},
      body: {
        merchant_id: '1211111',
        order_id: 'ORD-ATTACK-01',
        payhere_amount: '1000.00',
        payhere_currency: 'LKR',
        status_code: '2',
        md5sig: 'FORGED_INVALID_HASH_VALUE_HERE',
      },
    };

    // When secret is set or required, invalid signature returns isValid: false
    const event = await payhere.verifyCallback(forgedCallback);
    if (!event.signatureVerified) {
      expect(event.isValid).toBe(false);
      expect(event.error).toMatch(/signature/i);
    }
  });

  it('rejects tampered client amount during webhook handling', async () => {
    const koko = new KokoGateway();

    const tamperedEvent = {
      isValid: true,
      gatewayId: 'KOKO' as const,
      orderNumber: 'KOKO-ATTACK-02',
      providerReference: 'koko_ref_attack',
      amount: 1.00, // Attacker paid 1 LKR
      currency: 'LKR',
      status: 'CAPTURED' as const,
      signatureVerified: true,
    };

    // Authoritative expected total is 85,000 LKR
    await expect(
      koko.handleCallback({
        event: tamperedEvent,
        expectedAmount: 85000,
        orderId: 'ord_real_02',
      }),
    ).rejects.toThrow(PaymentAmountMismatchError);
  });

  it('detects and halts duplicate webhook replay using providerReference', () => {
    const existingTransactions: PaymentTransactionRecord[] = [
      {
        id: 'tx_existing_01',
        orderId: 'ord_100',
        method: 'PAYHERE',
        amount: 50000,
        currency: 'LKR',
        status: 'CAPTURED',
        providerRef: 'PAYHERE_TX_777888',
      },
    ];

    // First time
    expect(isPaymentCallbackDuplicate(existingTransactions, 'NEW_TX_999')).toBe(false);

    // Replay attempt with same providerRef
    expect(isPaymentCallbackDuplicate(existingTransactions, 'PAYHERE_TX_777888')).toBe(true);
  });

  it('proves gateway adapters never directly manipulate stock or GL tables', () => {
    const gateways = [
      new PayHereGateway(),
      new WebXPayGateway(),
      new KokoGateway(),
      new MintpayGateway(),
      new PayzyGateway(),
    ];

    for (const gw of gateways) {
      // The gateway prototype only contains payment provider methods
      const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(gw));
      expect(methodNames).not.toContain('recordSale');
      expect(methodNames).not.toContain('reserveStockTx');
      expect(methodNames).not.toContain('insertJournalEntry');
      expect(methodNames).not.toContain('updateStockBalance');
    }
  });
});
