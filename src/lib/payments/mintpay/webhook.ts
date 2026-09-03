import { createHmac } from 'crypto';

export function verifyMintpayWebhookSignature(
  rawBody: string | Record<string, unknown>,
  signature: string,
  apiSecret: string,
): boolean {
  if (!apiSecret || !signature) return false;
  const content = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  const expected = createHmac('sha256', apiSecret).update(content).digest('hex');
  return expected.toLowerCase() === signature.toLowerCase();
}
