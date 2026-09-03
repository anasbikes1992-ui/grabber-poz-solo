import { createHash } from 'crypto';

/**
 * Validates PayHere MD5 signature:
 * md5sig = MD5(merchant_id + order_id + amount + currency + status_code + MD5(secret))
 */
export function verifyPayHereCallbackSignature(
  params: Record<string, string>,
  secret: string,
): boolean {
  if (!secret) return false;
  const merchantId = params.merchant_id || '';
  const orderId = params.order_id || '';
  const amount = params.payhere_amount || '';
  const currency = params.payhere_currency || '';
  const statusCode = params.status_code || '';
  const md5sig = (params.md5sig || '').toUpperCase();

  const secretHash = createHash('md5').update(secret).digest('hex').toUpperCase();
  const local = createHash('md5')
    .update(merchantId + orderId + amount + currency + statusCode + secretHash)
    .digest('hex')
    .toUpperCase();

  return local === md5sig;
}
