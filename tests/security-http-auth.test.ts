import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware';
import { encodeSession, assertRole } from '../src/lib/auth/session';
import { payHereWebhookSecretRequired } from '../src/lib/payments/payhere-signature';
import { GET as cronGet } from '../src/app/api/cron/process-jobs/route';
import { POST as payHerePost } from '../src/app/api/webhooks/payhere/route';
import { scanApiAuthCoverage } from '../scripts/api-auth-coverage.mjs';

/** NODE_ENV is typed read-only; tests still need to toggle it. */
function setNodeEnv(value: string | undefined) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

describe('security HTTP auth — middleware (garbage cookie)', () => {
  const prevSecret = process.env.AUTH_SECRET;
  const prevEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.AUTH_SECRET = 'unit-test-auth-secret-32chars-min!!';
    setNodeEnv('production');
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prevSecret;
    setNodeEnv(prevEnv);
  });

  async function hit(path: string, cookie?: string) {
    const headers = new Headers();
    if (cookie) headers.set('cookie', cookie);
    const req = new NextRequest(`http://localhost${path}`, { headers });
    return middleware(req);
  }

  it('rejects garbage staff cookie on /api/inventory with 401', async () => {
    const res = await hit('/api/inventory', 'grabber_session=not-a-valid-token');
    expect(res.status).toBe(401);
  });

  it('rejects garbage staff cookie on /api/products with 401', async () => {
    const res = await hit('/api/products', 'grabber_session=abc.def');
    expect(res.status).toBe(401);
  });

  it('rejects garbage staff cookie on /api/polim-potha with 401', async () => {
    const res = await hit('/api/polim-potha', 'grabber_session=x');
    expect(res.status).toBe(401);
  });

  it('rejects missing cookie on privileged APIs with 401', async () => {
    for (const path of ['/api/inventory', '/api/products', '/api/polim-potha', '/api/reports/tax']) {
      const res = await hit(path);
      expect(res.status, path).toBe(401);
    }
  });

  it('accepts valid HMAC staff cookie through middleware', async () => {
    const token = encodeSession({
      userId: 'u1',
      email: 'a@b.c',
      name: 'A',
      role: 'OWNER',
    });
    const res = await hit('/api/inventory', `grabber_session=${token}`);
    expect(res.status).toBe(200);
  });

  it('allows intentionally public promotion evaluate without cookie', async () => {
    const res = await hit('/api/promotions/evaluate-cart');
    expect(res.status).toBe(200);
  });
});

describe('security HTTP auth — WhatsApp send / seed / cron / PayHere', () => {
  const prevEnv = process.env.NODE_ENV;
  const prevCron = process.env.CRON_SECRET;
  const prevAuth = process.env.AUTH_SECRET;

  afterEach(() => {
    setNodeEnv(prevEnv);
    if (prevCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevCron;
    if (prevAuth === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prevAuth;
  });

  it('cashier role is forbidden from owner-only seed gate', () => {
    const cashier = {
      userId: 'c1',
      email: 'c@x.com',
      name: 'Cashier',
      role: 'CASHIER' as const,
    };
    expect(() => assertRole(cashier, ['OWNER', 'ADMIN'])).toThrow(/Forbidden/);
    try {
      assertRole(cashier, ['OWNER', 'ADMIN']);
    } catch (e) {
      expect((e as { status?: number }).status).toBe(403);
    }
  });

  it('cron without CRON_SECRET in production returns 401', async () => {
    setNodeEnv('production');
    delete process.env.CRON_SECRET;
    const res = await cronGet(new Request('http://localhost/api/cron/process-jobs'));
    expect(res.status).toBe(401);
  });

  it('cron with wrong bearer returns 401', async () => {
    setNodeEnv('production');
    process.env.CRON_SECRET = 'correct-secret';
    const res = await cronGet(
      new Request('http://localhost/api/cron/process-jobs', {
        headers: { authorization: 'Bearer wrong' },
      }),
    );
    expect(res.status).toBe(401);
  });

  it('PayHere webhook fails closed when production secret missing', async () => {
    setNodeEnv('production');
    delete process.env.PAYHERE_SECRET;
    delete process.env.PAYHERE_MERCHANT_ID;
    expect(payHereWebhookSecretRequired()).toBe(true);
    const res = await payHerePost(
      new Request('http://localhost/api/webhooks/payhere', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ order_id: 'x', status_code: '2' }),
      }),
    );
    expect([401, 403, 503]).toContain(res.status);
  });

  it('WhatsApp send path is middleware-protected (garbage cookie → 401)', async () => {
    process.env.AUTH_SECRET = 'unit-test-auth-secret-32chars-min!!';
    setNodeEnv('production');
    const headers = new Headers({
      cookie: 'grabber_session=garbage',
      'content-type': 'application/json',
    });
    const req = new NextRequest('http://localhost/api/integrations/whatsapp/send', {
      method: 'POST',
      headers,
    });
    const res = await middleware(req);
    expect(res.status).toBe(401);
  });
});

describe('security — API auth coverage inventory', () => {
  it('classifies every /api route with zero UNCLASSIFIED', () => {
    const result = scanApiAuthCoverage();
    expect(result.unclassified, JSON.stringify(result.unclassified, null, 2)).toEqual([]);
    expect(result.total).toBeGreaterThan(50);
  });
});

describe('security — AUTH_OPTIONAL boot refuse', () => {
  it('documents production invariant (instrumentation throws)', async () => {
    // Static check: instrumentation contains the fail-closed guard.
    const fs = await import('fs');
    const src = fs.readFileSync('src/instrumentation.ts', 'utf8');
    expect(src).toMatch(/AUTH_OPTIONAL/);
    expect(src).toMatch(/production/);
    expect(src).toMatch(/throw new Error/);
  });
});
