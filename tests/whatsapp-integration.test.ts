import { describe, it, expect } from 'vitest';
import {
  buildAppSecretProof,
  buildWhatsAppMessagesUrl,
  normalizeWhatsAppTo,
  resolveWhatsAppConfig,
  verifyWhatsAppWebhookSignature,
} from '../src/lib/integrations/whatsapp';
import {
  isWhatsAppGreeting,
  resolveStorefrontWhatsAppNumber,
  WHATSAPP_PLACEHOLDER_DIGITS,
} from '../src/lib/whatsapp/inbound-handler';

describe('whatsapp integration', () => {
  it('normalizeWhatsAppTo strips non-digits', () => {
    expect(normalizeWhatsAppTo('+94 77 123 4567')).toBe('94771234567');
  });

  it('resolveStorefrontWhatsAppNumber prefers NEXT_PUBLIC_WHATSAPP_NUMBER', () => {
    const prev = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = '+94770000001';
    expect(resolveStorefrontWhatsAppNumber('+94771234567')).toBe('+94770000001');
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = prev;
  });

  it('resolveStorefrontWhatsAppNumber drops placeholder when env unset', () => {
    const prev = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    expect(resolveStorefrontWhatsAppNumber(`+${WHATSAPP_PLACEHOLDER_DIGITS}`)).toBeUndefined();
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = prev;
  });

  it('isWhatsAppGreeting matches common openers', () => {
    expect(isWhatsAppGreeting('hi')).toBe(true);
    expect(isWhatsAppGreeting('Hello!')).toBe(true);
    expect(isWhatsAppGreeting('order 123')).toBe(false);
  });

  it('resolveWhatsAppConfig reads PHONE_NUMBER_ID alias', () => {
    const prev = process.env.WHATSAPP_PHONE_NUMBER_ID;
    process.env.WHATSAPP_PHONE_ID = '';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '12345';
    expect(resolveWhatsAppConfig().phoneId).toBe('12345');
    process.env.WHATSAPP_PHONE_NUMBER_ID = prev;
  });

  it('buildAppSecretProof matches Meta HMAC-SHA256(access_token, app_secret)', () => {
    const crypto = require('crypto');
    const token = 'test_access_token';
    const secret = 'test_app_secret';
    const expected = crypto.createHmac('sha256', secret).update(token).digest('hex');
    expect(buildAppSecretProof(token, secret)).toBe(expected);
  });

  it('buildWhatsAppMessagesUrl appends appsecret_proof when secret set', () => {
    const url = buildWhatsAppMessagesUrl('12345', 'v21.0', 'tok', 'sec');
    expect(url).toContain('appsecret_proof=');
    expect(url.startsWith('https://graph.facebook.com/v21.0/12345/messages?')).toBe(true);
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
