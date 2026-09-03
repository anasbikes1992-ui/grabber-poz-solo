import { createHash } from 'crypto';

/** PayHere md5sig = MD5(merchant_id + order_id + amount + currency + status_code + MD5(secret)) */
export function verifyPayHereSignature(params: Record<string, string>, secret: string): boolean {
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

/** Production must never accept unsigned PayHere callbacks. */
export function payHereWebhookSecretRequired(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv === 'production';
}
