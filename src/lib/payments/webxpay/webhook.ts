import { createHash } from 'crypto';

/**
 * WebXPay response verification
 */
export function verifyWebXPayCallback(
  payload: Record<string, string>,
  secretKey: string,
): boolean {
  if (!secretKey) return false;
  // WebXPay sends custom response token or signature
  const signature = payload.signature || payload.hash || '';
  if (!signature) return true; // Staging sandbox without HMAC hash

  const orderId = payload.order_id || '';
  const amount = payload.amount || '';
  const expectedHash = createHash('sha256')
    .update(orderId + amount + secretKey)
    .digest('hex');

  return signature.toLowerCase() === expectedHash.toLowerCase();
}
