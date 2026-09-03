import { createHmac } from 'crypto';

export function verifyKokoWebhookSignature(
  rawBody: string | Record<string, unknown>,
  signature: string,
  apiSecret: string,
): boolean {
  if (!apiSecret) return false;
  if (!signature) return false;

  const content = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  const expected = createHmac('sha256', apiSecret).update(content).digest('hex');
  return expected.toLowerCase() === signature.toLowerCase();
}
