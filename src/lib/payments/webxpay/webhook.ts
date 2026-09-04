import { createHash, timingSafeEqual } from 'crypto';

/**
 * PAY-001: WebXPay SHA-256 HMAC / Digest verification
 */
export function verifyWebXPayCallback(
  payload: Record<string, string>,
  secretKey: string,
): boolean {
  if (!secretKey) return false;
  const signature = (payload.signature || payload.hash || '').trim();
  if (!signature) return false;

  const orderId = payload.order_id || '';
  const amount = payload.amount || '';
  const expectedHash = createHash('sha256')
    .update(orderId + amount + secretKey)
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(signature.toLowerCase(), 'utf8'),
      Buffer.from(expectedHash.toLowerCase(), 'utf8'),
    );
  } catch {
    return false;
  }
}

export interface WebXPayWebhookAuditInput {
  params: Record<string, string>;
  expectedSecretKey?: string;
  order?: {
    orderNumber: string;
    grandTotal: string | number;
    currency?: string;
    paymentStatus?: string;
  } | null;
}

export interface WebXPayWebhookAuditResult {
  valid: boolean;
  code: string;
  error?: string;
}

export function auditWebXPayWebhook(input: WebXPayWebhookAuditInput): WebXPayWebhookAuditResult {
  const { params, expectedSecretKey, order } = input;

  // PAY-001: Signature verified
  if (!expectedSecretKey) {
    if (process.env.NODE_ENV === 'production') {
      return { valid: false, code: 'PAY_001_SECRET_MISSING', error: 'WebXPay secret key is not configured' };
    }
  } else {
    if (!verifyWebXPayCallback(params, expectedSecretKey)) {
      return { valid: false, code: 'PAY_001_SIGNATURE_MISMATCH', error: 'Cryptographic signature mismatch' };
    }
  }

  // PAY-005: Order / reference verified
  if (!order) {
    return { valid: false, code: 'PAY_005_ORDER_NOT_FOUND', error: 'Referenced order not found' };
  }

  // PAY-003: Authoritative amount verified
  if (params.amount != null) {
    const webhookAmount = parseFloat(params.amount);
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
  if (params.currency) {
    const expectedCurrency = (order.currency || 'LKR').toUpperCase();
    if (params.currency.toUpperCase() !== expectedCurrency) {
      return {
        valid: false,
        code: 'PAY_004_CURRENCY_MISMATCH',
        error: `Currency mismatch: webhook specified ${params.currency}, order requires ${expectedCurrency}`,
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
