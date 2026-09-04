import { createHash, timingSafeEqual } from 'crypto';

/**
 * PAY-001: PayHere md5sig = MD5(merchant_id + order_id + amount + currency + status_code + MD5(secret))
 */
export function verifyPayHereSignature(params: Record<string, string>, secret: string): boolean {
  if (!secret) return false;
  const merchantId = params.merchant_id || '';
  const orderId = params.order_id || '';
  const amount = params.payhere_amount || '';
  const currency = params.payhere_currency || '';
  const statusCode = params.status_code || '';
  const md5sig = (params.md5sig || '').toUpperCase().trim();
  if (!md5sig) return false;

  const secretHash = createHash('md5').update(secret).digest('hex').toUpperCase();
  const local = createHash('md5')
    .update(merchantId + orderId + amount + currency + statusCode + secretHash)
    .digest('hex')
    .toUpperCase();

  try {
    return timingSafeEqual(Buffer.from(local, 'utf8'), Buffer.from(md5sig, 'utf8'));
  } catch {
    return false;
  }
}

/** Production must never accept unsigned PayHere callbacks. */
export function payHereWebhookSecretRequired(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv === 'production';
}

export interface PayHereWebhookAuditInput {
  params: Record<string, string>;
  expectedMerchantId?: string;
  expectedSecret?: string;
  order?: {
    orderNumber: string;
    grandTotal: string | number;
    currency?: string;
    paymentStatus?: string;
  } | null;
}

export interface PayHereWebhookAuditResult {
  valid: boolean;
  code: string;
  error?: string;
}

/**
 * PAY-001 through PAY-008 Comprehensive Webhook Verification
 */
export function auditPayHereWebhook(input: PayHereWebhookAuditInput): PayHereWebhookAuditResult {
  const { params, expectedMerchantId, expectedSecret, order } = input;

  // PAY-001: Signature verified
  if (!expectedSecret) {
    if (payHereWebhookSecretRequired()) {
      return { valid: false, code: 'PAY_001_SECRET_MISSING', error: 'PayHere webhook secret is not configured' };
    }
  } else {
    if (!verifyPayHereSignature(params, expectedSecret)) {
      return { valid: false, code: 'PAY_001_SIGNATURE_MISMATCH', error: 'Cryptographic signature mismatch' };
    }
  }

  // PAY-002: Merchant identity verified
  if (expectedMerchantId && params.merchant_id && params.merchant_id !== expectedMerchantId) {
    return { valid: false, code: 'PAY_002_MERCHANT_MISMATCH', error: 'Merchant ID does not match configuration' };
  }

  // PAY-005: Order / reference verified
  if (!order) {
    return { valid: false, code: 'PAY_005_ORDER_NOT_FOUND', error: 'Referenced order not found' };
  }

  // PAY-003: Authoritative amount verified
  if (params.payhere_amount != null) {
    const webhookAmount = parseFloat(params.payhere_amount);
    const expectedAmount = parseFloat(String(order.grandTotal));
    if (isNaN(webhookAmount) || Math.abs(webhookAmount - expectedAmount) > 0.05) {
      return {
        valid: false,
        code: 'PAY_003_AMOUNT_MISMATCH',
        error: `Amount mismatch: webhook specified ${webhookAmount}, order requires ${expectedAmount}`,
      };
    }
  }

  // PAY-004: Currency verified
  if (params.payhere_currency) {
    const expectedCurrency = (order.currency || 'LKR').toUpperCase();
    if (params.payhere_currency.toUpperCase() !== expectedCurrency) {
      return {
        valid: false,
        code: 'PAY_004_CURRENCY_MISMATCH',
        error: `Currency mismatch: webhook specified ${params.payhere_currency}, order requires ${expectedCurrency}`,
      };
    }
  }

  // PAY-008: Payment state transition enforced
  const illegalStates = ['CANCELLED', 'REFUNDED', 'VOIDED'];
  if (order.paymentStatus && illegalStates.includes(order.paymentStatus.toUpperCase())) {
    return {
      valid: false,
      code: 'PAY_008_ILLEGAL_STATE_TRANSITION',
      error: `Cannot apply payment callback to order in state ${order.paymentStatus}`,
    };
  }

  return { valid: true, code: 'PAY_VERIFIED' };
}
