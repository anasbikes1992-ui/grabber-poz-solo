import { createHmac } from 'crypto';

export function verifyPayzyWebhookSignature(
  rawBody: string | Record<string, unknown>,
  signature: string,
  appSecret: string,
): boolean {
  if (!appSecret || !signature) return false;
  const content = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  const expected = createHmac('sha256', appSecret).update(content).digest('hex');
  return expected.toLowerCase() === signature.toLowerCase();
}
