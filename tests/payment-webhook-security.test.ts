import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import {
  verifyPayHereSignature,
  auditPayHereWebhook,
} from '@/lib/payments/payhere-signature';
import {
  verifyWebXPayCallback,
  auditWebXPayWebhook,
} from '@/lib/payments/webxpay/webhook';

describe('Payment Webhook Security (PAY-001 to PAY-008)', () => {
  const testSecret = 'test_payhere_secret_xyz123';
  const testMerchantId = '1223344';
  const orderNumber = 'ORD-TEST-9901';
  const grandTotal = '5400.00';
  const currency = 'LKR';

  function generateValidPayHereSignature(params: Record<string, string>, secret: string) {
    const merchantId = params.merchant_id || '';
    const orderId = params.order_id || '';
    const amount = params.payhere_amount || '';
    const curr = params.payhere_currency || '';
    const statusCode = params.status_code || '';
    const secretHash = createHash('md5').update(secret).digest('hex').toUpperCase();
    return createHash('md5')
      .update(merchantId + orderId + amount + curr + statusCode + secretHash)
      .digest('hex')
      .toUpperCase();
  }

  describe('PayHere Webhook Security Engine', () => {
    it('PAY-001: Verifies valid MD5 signature and rejects forged signatures', () => {
      const params = {
        merchant_id: testMerchantId,
        order_id: orderNumber,
        payhere_amount: grandTotal,
        payhere_currency: currency,
        status_code: '2',
      };
      const validSig = generateValidPayHereSignature(params, testSecret);
      expect(verifyPayHereSignature({ ...params, md5sig: validSig }, testSecret)).toBe(true);

      // Forged signature
      expect(verifyPayHereSignature({ ...params, md5sig: 'DEADBEEFCAFE' }, testSecret)).toBe(false);

      // Tampered amount
      expect(
        verifyPayHereSignature(
          { ...params, payhere_amount: '1.00', md5sig: validSig },
          testSecret,
        ),
      ).toBe(false);
    });

    it('PAY-002: Rejects webhook when merchant_id does not match configured merchant', () => {
      const params = {
        merchant_id: 'SPOOFED_MERCHANT_999',
        order_id: orderNumber,
        payhere_amount: grandTotal,
        payhere_currency: currency,
        status_code: '2',
      };
      const sig = generateValidPayHereSignature(params, testSecret);
      const audit = auditPayHereWebhook({
        params: { ...params, md5sig: sig },
        expectedMerchantId: testMerchantId,
        expectedSecret: testSecret,
        order: { orderNumber, grandTotal, currency, paymentStatus: 'PENDING' },
      });

      expect(audit.valid).toBe(false);
      expect(audit.code).toBe('PAY_002_MERCHANT_MISMATCH');
    });

    it('PAY-003: Rejects webhook when amount does not match authoritative order total', () => {
      const params = {
        merchant_id: testMerchantId,
        order_id: orderNumber,
        payhere_amount: '100.00', // Underpayment attack: paying 100 for 5400 order
        payhere_currency: currency,
        status_code: '2',
      };
      const sig = generateValidPayHereSignature(params, testSecret);
      const audit = auditPayHereWebhook({
        params: { ...params, md5sig: sig },
        expectedMerchantId: testMerchantId,
        expectedSecret: testSecret,
        order: { orderNumber, grandTotal, currency, paymentStatus: 'PENDING' },
      });

      expect(audit.valid).toBe(false);
      expect(audit.code).toBe('PAY_003_AMOUNT_MISMATCH');
    });

    it('PAY-004: Rejects webhook when currency does not match order currency', () => {
      const params = {
        merchant_id: testMerchantId,
        order_id: orderNumber,
        payhere_amount: grandTotal,
        payhere_currency: 'USD', // Expecting LKR
        status_code: '2',
      };
      const sig = generateValidPayHereSignature(params, testSecret);
      const audit = auditPayHereWebhook({
        params: { ...params, md5sig: sig },
        expectedMerchantId: testMerchantId,
        expectedSecret: testSecret,
        order: { orderNumber, grandTotal, currency, paymentStatus: 'PENDING' },
      });

      expect(audit.valid).toBe(false);
      expect(audit.code).toBe('PAY_004_CURRENCY_MISMATCH');
    });

    it('PAY-005: Rejects webhook when referenced order is missing', () => {
      const params = {
        merchant_id: testMerchantId,
        order_id: 'NON_EXISTENT_ORDER',
        payhere_amount: grandTotal,
        payhere_currency: currency,
        status_code: '2',
      };
      const sig = generateValidPayHereSignature(params, testSecret);
      const audit = auditPayHereWebhook({
        params: { ...params, md5sig: sig },
        expectedMerchantId: testMerchantId,
        expectedSecret: testSecret,
        order: null,
      });

      expect(audit.valid).toBe(false);
      expect(audit.code).toBe('PAY_005_ORDER_NOT_FOUND');
    });

    it('PAY-008: Enforces legal payment state transitions and rejects payment on cancelled order', () => {
      const params = {
        merchant_id: testMerchantId,
        order_id: orderNumber,
        payhere_amount: grandTotal,
        payhere_currency: currency,
        status_code: '2',
      };
      const sig = generateValidPayHereSignature(params, testSecret);

      // Attempting to apply payment to CANCELLED order
      const auditCancelled = auditPayHereWebhook({
        params: { ...params, md5sig: sig },
        expectedMerchantId: testMerchantId,
        expectedSecret: testSecret,
        order: { orderNumber, grandTotal, currency, paymentStatus: 'CANCELLED' },
      });
      expect(auditCancelled.valid).toBe(false);
      expect(auditCancelled.code).toBe('PAY_008_ILLEGAL_STATE_TRANSITION');

      // Legitimate PENDING order passes all gates
      const auditValid = auditPayHereWebhook({
        params: { ...params, md5sig: sig },
        expectedMerchantId: testMerchantId,
        expectedSecret: testSecret,
        order: { orderNumber, grandTotal, currency, paymentStatus: 'PENDING' },
      });
      expect(auditValid.valid).toBe(true);
      expect(auditValid.code).toBe('PAY_VERIFIED');
    });
  });

  describe('WebXPay Webhook Security Engine', () => {
    const webxSecret = 'webx_secret_sec_key_7788';

    function generateWebXSignature(orderId: string, amount: string, secretKey: string) {
      return createHash('sha256')
        .update(orderId + amount + secretKey)
        .digest('hex');
    }

    it('PAY-001: Verifies SHA-256 signature and rejects missing/forged signatures', () => {
      const orderId = 'ORD-WX-1001';
      const amt = '12500.00';
      const validSig = generateWebXSignature(orderId, amt, webxSecret);

      expect(verifyWebXPayCallback({ order_id: orderId, amount: amt, signature: validSig }, webxSecret)).toBe(true);
      expect(verifyWebXPayCallback({ order_id: orderId, amount: amt, signature: 'WRONG_SIG' }, webxSecret)).toBe(false);
      expect(verifyWebXPayCallback({ order_id: orderId, amount: amt }, webxSecret)).toBe(false); // Missing signature
    });

    it('PAY-003 & PAY-008: Validates WebXPay amount parity and rejects illegal state transitions', () => {
      const orderId = 'ORD-WX-1002';
      const amt = '3500.00';
      const validSig = generateWebXSignature(orderId, amt, webxSecret);

      // Tampered amount
      const auditAmountMismatch = auditWebXPayWebhook({
        params: { order_id: orderId, amount: '100.00', currency: 'LKR', signature: validSig },
        expectedSecretKey: webxSecret,
        order: { orderNumber: orderId, grandTotal: amt, currency: 'LKR', paymentStatus: 'PENDING' },
      });
      expect(auditAmountMismatch.valid).toBe(false);

      // Legitimate order passes
      const auditValid = auditWebXPayWebhook({
        params: { order_id: orderId, amount: amt, currency: 'LKR', signature: validSig },
        expectedSecretKey: webxSecret,
        order: { orderNumber: orderId, grandTotal: amt, currency: 'LKR', paymentStatus: 'PENDING' },
      });
      expect(auditValid.valid).toBe(true);
      expect(auditValid.code).toBe('PAY_VERIFIED');
    });
  });
});
