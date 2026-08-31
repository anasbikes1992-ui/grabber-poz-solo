/**
 * Shopper (customer) session — separate cookie from staff grabber_session.
 */

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { CUSTOMER_COOKIE_NAME, CUSTOMER_MAX_AGE_SEC } from './session-constants';
import { hashPin, verifyPin } from './session';

export type CustomerSession = {
  customerId: string;
  name: string;
  email: string | null;
  phone: string;
};

function authSecret(): string {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET required');
    return 'dev-only-insecure-auth-secret-change-me';
  }
  return s;
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b.toString('base64url');
}

function sign(payloadB64: string): string {
  return createHmac('sha256', authSecret()).update(payloadB64).digest('base64url');
}

export function encodeCustomerSession(user: CustomerSession): string {
  const body = { ...user, kind: 'customer', exp: Math.floor(Date.now() / 1000) + CUSTOMER_MAX_AGE_SEC };
  const payloadB64 = b64url(JSON.stringify(body));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function decodeCustomerSession(token: string | undefined | null): CustomerSession | null {
  if (!token) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const body = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as CustomerSession & {
      exp: number;
      kind?: string;
    };
    if (body.kind !== 'customer') return null;
    if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      customerId: body.customerId,
      name: body.name,
      email: body.email,
      phone: body.phone,
    };
  } catch {
    return null;
  }
}

export async function setCustomerSessionCookie(user: CustomerSession): Promise<void> {
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE_NAME, encodeCustomerSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CUSTOMER_MAX_AGE_SEC,
  });
}

export async function clearCustomerSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE_NAME);
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const jar = await cookies();
  return decodeCustomerSession(jar.get(CUSTOMER_COOKIE_NAME)?.value);
}

/** Reuse staff PIN hasher for shopper passwords (scrypt). */
export const hashShopperPassword = hashPin;
export const verifyShopperPassword = verifyPin;
