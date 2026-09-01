import { describe, it, expect } from 'vitest';
import {
  normalizeWhatsAppTo,
  resolveWhatsAppConfig,
  verifyWhatsAppWebhookSignature,
} from '../src/lib/integrations/whatsapp';

describe('whatsapp integration', () => {
  it('normalizeWhatsAppTo strips non-digits', () => {
    expect(normalizeWhatsAppTo('+94 77 123 4567')).toBe('94771234567');
  });

  it('resolveWhatsAppConfig reads PHONE_NUMBER_ID alias', () => {
    const prev = process.env.WHATSAPP_PHONE_NUMBER_ID;
    process.env.WHATSAPP_PHONE_ID = '';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '12345';
    expect(resolveWhatsAppConfig().phoneId).toBe('12345');
    process.env.WHATSAPP_PHONE_NUMBER_ID = prev;
  });

  it('verifyWhatsAppWebhookSignature passes with valid HMAC', () => {
    const prev = process.env.WHATSAPP_APP_SECRET;
    process.env.WHATSAPP_APP_SECRET = 'test_secret';
    const body = '{"entry":[]}';
    const crypto = require('crypto');
    const sig =
      'sha256=' + crypto.createHmac('sha256', 'test_secret').update(body, 'utf8').digest('hex');
    expect(verifyWhatsAppWebhookSignature(body, sig)).toBe(true);
    process.env.WHATSAPP_APP_SECRET = prev;
  });
});
