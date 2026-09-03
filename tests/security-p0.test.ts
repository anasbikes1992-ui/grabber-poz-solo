import { describe, it, expect, afterEach } from 'vitest';
import { createHash, createHmac } from 'crypto';
import { decodeSession, encodeSession } from '../src/lib/auth/session';
import { decodeSessionEdge } from '../src/lib/auth/session-edge';
import { isStaffMiddlewareOptional } from '../src/lib/auth/session-constants';
import { verifyWhatsAppWebhookSignature } from '../src/lib/integrations/whatsapp';
import {
  payHereWebhookSecretRequired,
  verifyPayHereSignature,
} from '../src/lib/payments/payhere-signature';
import { runEnvironmentValidation } from '../scripts/validate-env.mjs';

/** NODE_ENV is typed read-only; tests still need to toggle it. */
function setNodeEnv(value: string | undefined) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

describe('security P0 — staff middleware optional', () => {
  it('never optional in production even if AUTH_OPTIONAL=true', () => {
    expect(isStaffMiddlewareOptional('production', 'true')).toBe(false);
    expect(isStaffMiddlewareOptional('production', undefined)).toBe(false);
  });

  it('is optional outside production (local DX)', () => {
    expect(isStaffMiddlewareOptional('development', undefined)).toBe(true);
    expect(isStaffMiddlewareOptional('test', 'false')).toBe(true);
  });
});

describe('security P0 — session HMAC', () => {
  const prev = process.env.AUTH_SECRET;

  afterEach(() => {
    if (prev === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prev;
  });

  it('rejects garbage cookie tokens', () => {
    process.env.AUTH_SECRET = 'unit-test-auth-secret-32chars-min!!';
    expect(decodeSession('not-a-token')).toBeNull();
    expect(decodeSession('abc.def')).toBeNull();
    expect(decodeSession('x')).toBeNull();
  });

  it('round-trips a signed session', () => {
    process.env.AUTH_SECRET = 'unit-test-auth-secret-32chars-min!!';
    const token = encodeSession({
      userId: 'u1',
      email: 'a@b.c',
      name: 'A',
      role: 'OWNER',
    });
    const user = decodeSession(token);
    expect(user?.userId).toBe('u1');
    expect(user?.role).toBe('OWNER');
  });

  it('Node encodeSession is accepted by Edge decodeSessionEdge (middleware)', async () => {
    process.env.AUTH_SECRET = 'unit-test-auth-secret-32chars-min!!';
    const token = encodeSession({
      userId: 'u2',
      email: 'edge@b.c',
      name: 'Edge',
      role: 'ADMIN',
    });
    const user = await decodeSessionEdge(token);
    expect(user?.userId).toBe('u2');
    expect(user?.role).toBe('ADMIN');
  });
});

describe('security P0 — PayHere webhook', () => {
  it('requires secret in production', () => {
    expect(payHereWebhookSecretRequired('production')).toBe(true);
    expect(payHereWebhookSecretRequired('development')).toBe(false);
  });

  it('verifies md5sig', () => {
    const secret = 'merchant_secret';
    const params = {
      merchant_id: '121XXXX',
      order_id: 'ORD1',
      payhere_amount: '100.00',
      payhere_currency: 'LKR',
      status_code: '2',
      md5sig: '',
    };
    const secretHash = createHash('md5').update(secret).digest('hex').toUpperCase();
    params.md5sig = createHash('md5')
      .update(
        params.merchant_id +
          params.order_id +
          params.payhere_amount +
          params.payhere_currency +
          params.status_code +
          secretHash,
      )
      .digest('hex')
      .toUpperCase();
    expect(verifyPayHereSignature(params, secret)).toBe(true);
    expect(verifyPayHereSignature({ ...params, md5sig: 'DEADBEEF' }, secret)).toBe(false);
  });
});

describe('security P0 — WhatsApp webhook signature', () => {
  const prevSecret = process.env.WHATSAPP_APP_SECRET;
  const prevEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.WHATSAPP_APP_SECRET;
    else process.env.WHATSAPP_APP_SECRET = prevSecret;
    setNodeEnv(prevEnv);
  });

  it('rejects unsigned webhooks in production when app secret missing', () => {
    delete process.env.WHATSAPP_APP_SECRET;
    setNodeEnv('production');
    expect(verifyWhatsAppWebhookSignature('{}', null)).toBe(false);
  });

  it('allows missing secret outside production (local Meta testing)', () => {
    delete process.env.WHATSAPP_APP_SECRET;
    setNodeEnv('development');
    expect(verifyWhatsAppWebhookSignature('{}', null)).toBe(true);
  });

  it('accepts valid HMAC when secret configured', () => {
    process.env.WHATSAPP_APP_SECRET = 'test_secret';
    setNodeEnv('production');
    const body = '{"entry":[]}';
    const sig = 'sha256=' + createHmac('sha256', 'test_secret').update(body, 'utf8').digest('hex');
    expect(verifyWhatsAppWebhookSignature(body, sig)).toBe(true);
  });
});

describe('security P0 — env validate production gates', () => {
  const snapshot = { ...process.env };
  const prevEnv = process.env.NODE_ENV;

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in snapshot)) delete process.env[k];
    }
    Object.assign(process.env, snapshot);
    setNodeEnv(prevEnv);
  });

  it('fails production when AUTH_OPTIONAL=true', async () => {
    setNodeEnv('production');
    process.env.AUTH_OPTIONAL = 'true';
    process.env.AUTH_SECRET = 'unit-test-auth-secret-32chars-min!!';
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    process.env.CRON_SECRET = 'cron-secret-value';
    const result = await runEnvironmentValidation();
    expect(result.success).toBe(false);
    expect(result.p0Errors.some((e) => e.includes('AUTH_OPTIONAL'))).toBe(true);
  });

  it('fails production when CRON_SECRET missing', async () => {
    setNodeEnv('production');
    delete process.env.AUTH_OPTIONAL;
    process.env.AUTH_SECRET = 'unit-test-auth-secret-32chars-min!!';
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    delete process.env.CRON_SECRET;
    const result = await runEnvironmentValidation();
    expect(result.success).toBe(false);
    expect(result.p0Errors.some((e) => e.includes('CRON_SECRET'))).toBe(true);
  });
});
