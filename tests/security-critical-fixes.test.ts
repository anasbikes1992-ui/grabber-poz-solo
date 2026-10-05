import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';

const state = vi.hoisted(() => ({
  session: null as null | { userId: string; role: string },
  shopper: null as null | { customerId: string },
  checkoutCalls: [] as Array<Record<string, unknown>>,
  eventInserts: 0,
  order: null as null | Record<string, unknown>,
  settled: [] as string[],
}));

vi.mock('@/db', () => {
  const chain = (rows: () => unknown) => {
    const c: Record<string, unknown> = {};
    for (const k of ['from', 'where', 'limit', 'orderBy']) c[k] = () => c;
    c.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve().then(rows).then(res, rej);
    return c;
  };
  return {
    orders: { _n: 'orders', orderNumber: 'orderNumber' },
    webhookEvents: { _n: 'webhook_events', providerEventId: 'id' },
    userAssignments: {},
    users: {},
    db: {
      select: () => chain(() => (state.order ? [state.order] : [])),
      insert: () => ({ values: () => { state.eventInserts += 1; return Promise.resolve(); } }),
      update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
    },
  };
});

vi.mock('@/lib/auth/session', async (orig) => {
  const actual = await orig<typeof import('@/lib/auth/session')>();
  return {
    ...actual,
    getSession: vi.fn(async () => state.session),
    verifyPin: vi.fn(() => false),
  };
});
vi.mock('@/lib/auth/customer-session', async (orig) => {
  const actual = await orig<typeof import('@/lib/auth/customer-session')>();
  return { ...actual, getCustomerSession: vi.fn(async () => state.shopper) };
});
vi.mock('@/lib/commerce/pos-checkout-service', () => ({
  processPosCheckout: vi.fn(async (input: Record<string, unknown>) => {
    state.checkoutCalls.push(input);
    return { reused: false, orderNumber: 'WEB-1' };
  }),
}));
vi.mock('@/lib/payments/lkr-provider', () => ({
  getPayHereConfig: () => ({ secret: 'whsec', merchantId: 'M1' }),
}));
vi.mock('@/lib/commerce/payment-settlement', () => ({
  settleGatewayPayment: vi.fn(async ({ orderNumber }: { orderNumber: string }) => {
    state.settled.push(orderNumber);
    return { settled: true, alreadyPaid: false };
  }),
}));

import { POST as checkoutPost } from '@/app/api/pos/checkout/route';
import { POST as payhereWebhook } from '@/app/api/webhooks/payhere/route';
import { encodeCustomerSession } from '@/lib/auth/customer-session';
import { decodeSession, encodeSession } from '@/lib/auth/session';
import { decodeSessionEdge, encodeSessionEdge } from '@/lib/auth/session-edge';
import { escapeHtml, safeJsonLd } from '@/lib/security/escape';
import { phoneLast4Matches } from '@/lib/tracking/order-tracker';
import { toPublicCatalogItem, PUBLIC_STOCK_CAP } from '@/lib/storefront/catalog-service';
import { assertIdempotentReuseAllowed } from '@/lib/db/repositories/checkout-repo';

const post = (body: unknown) =>
  checkoutPost(new Request('http://x/api/pos/checkout', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  state.session = null;
  state.shopper = { customerId: 'c1' };
  state.checkoutCalls = [];
  state.eventInserts = 0;
  state.order = null;
  state.settled = [];
});

describe('C1/C2: storefront checkout cannot self-declare payment or credit', () => {
  const base = { channel: 'STOREFRONT', branchId: 'b', items: [{ productId: 'p', quantity: 1 }] };

  it.each(['CARD', 'CASH', 'CREDIT', undefined])('rejects %s tender on the storefront channel', async (paymentMethod) => {
    const res = await post({ ...base, paymentMethod });
    expect(res.status).toBe(400);
    expect(state.checkoutCalls).toHaveLength(0);
  });

  it('rejects split tender on the storefront channel', async () => {
    const res = await post({ ...base, paymentMethod: 'COD', payments: [{ method: 'CASH', amount: 1 }] });
    expect(res.status).toBe(400);
  });

  it('allows COD and drops client-controlled fields', async () => {
    const res = await post({
      ...base,
      paymentMethod: 'COD',
      tradeInCredit: 99999,
      orderNumber: 'ADMIN-1',
      allowStockUnderrun: true,
      offlineSync: true,
    });
    expect(res.status).toBe(200);
    const call = state.checkoutCalls[0];
    expect(call.tradeInCredit).toBeUndefined();
    expect(call.orderNumber).toBeUndefined();
    expect(call.allowStockUnderrun).toBeUndefined();
    expect(call.offlineSync).toBeUndefined();
  });
});

describe('C4: staff/shopper token separation', () => {
  const customerToken = () =>
    encodeCustomerSession({ customerId: 'c1', name: 'Eve', email: null, phone: '0771234567' });

  it('staff decoders reject a shopper token', async () => {
    expect(decodeSession(customerToken())).toBeNull();
    expect(await decodeSessionEdge(customerToken())).toBeNull();
  });

  it('staff decoders reject legacy tokens without kind', async () => {
    const legacy = await (async () => {
      const { createHmac } = await import('crypto');
      const payload = Buffer.from(JSON.stringify({ userId: 'u', role: 'OWNER', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url');
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'dev-only-insecure-auth-secret-change-me';
      return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
    })();
    expect(decodeSession(legacy)).toBeNull();
    expect(await decodeSessionEdge(legacy)).toBeNull();
  });

  it('round-trips real staff tokens in both runtimes', async () => {
    const user = { userId: 'u1', email: 'a@b.c', name: 'A', role: 'MANAGER' as const };
    expect(decodeSession(encodeSession(user))?.role).toBe('MANAGER');
    expect((await decodeSessionEdge(await encodeSessionEdge(user)))?.userId).toBe('u1');
  });
});

describe('C5/C6: escaping', () => {
  it('escapes HTML metacharacters', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe('&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
  });

  it('safeJsonLd cannot terminate the script element', () => {
    const out = safeJsonLd({ name: '</script><script>alert(1)</script>', a: 'x y' });
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });
});

describe('H4: phoneLast4 matching', () => {
  it('does not match email-only customers or malformed guesses', () => {
    expect(phoneLast4Matches('email:a@b.c', 'x')).toBe(false);
    expect(phoneLast4Matches('email:a@b.c', '')).toBe(false);
    expect(phoneLast4Matches('0771234567', '4567')).toBe(true);
    expect(phoneLast4Matches('0771234567', '67')).toBe(false);
    expect(phoneLast4Matches('0771234567', '4568')).toBe(false);
  });
});

describe('H5: public catalog projection', () => {
  it('hides cost and caps stock', () => {
    const item = { id: '1', productId: '1', slug: 's', name: 'n', sku: 'k', barcode: 'b', unitPrice: 10, unitCost: 4, stock: 900, variant: 'v', category: 'c' };
    const pub = toPublicCatalogItem(item);
    expect(pub.unitCost).toBe(0);
    expect(pub.stock).toBe(PUBLIC_STOCK_CAP);
    expect(toPublicCatalogItem({ ...item, stock: -3 }).stock).toBe(0);
  });
});

describe('H8: idempotent replay ownership', () => {
  it('allows the owner and unowned orders, refuses others', () => {
    expect(() => assertIdempotentReuseAllowed({ customerId: 'c1' }, { customerId: 'c1' })).not.toThrow();
    expect(() => assertIdempotentReuseAllowed({ createdBy: 'u1' }, { actorId: 'u1' })).not.toThrow();
    expect(() => assertIdempotentReuseAllowed({}, {})).not.toThrow();
    expect(() => assertIdempotentReuseAllowed({ customerId: 'c1' }, { customerId: 'c2' })).toThrowError(/already used/);
    expect(() => assertIdempotentReuseAllowed({ customerId: 'c1' }, {})).toThrowError(/already used/);
  });
});

describe('H7: PayHere webhook verifies before it records or settles', () => {
  const secretHash = createHash('md5').update('whsec').digest('hex').toUpperCase();
  const sign = (p: Record<string, string>) =>
    createHash('md5')
      .update(p.merchant_id + p.order_id + p.payhere_amount + p.payhere_currency + p.status_code + secretHash)
      .digest('hex')
      .toUpperCase();
  const params = { merchant_id: 'M1', order_id: 'WEB-1', payhere_amount: '100.00', payhere_currency: 'LKR', status_code: '2', payment_id: 'pay1' };
  const send = (p: Record<string, string>) =>
    payhereWebhook(new Request('http://x/api/webhooks/payhere', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    }));

  beforeEach(() => {
    state.order = { orderNumber: 'WEB-1', grandTotal: '100.00', paymentStatus: 'PENDING' };
  });

  it('forged signature: 400, no dedup row, no settlement', async () => {
    const res = await send({ ...params, md5sig: 'DEADBEEF' });
    expect(res.status).toBe(400);
    expect(state.eventInserts).toBe(0);
    expect(state.settled).toEqual([]);
  });

  it('valid signature: records the event and settles the order', async () => {
    const res = await send({ ...params, md5sig: sign(params) });
    expect(res.status).toBe(200);
    expect(state.eventInserts).toBe(1);
    expect(state.settled).toEqual(['WEB-1']);
  });
});
