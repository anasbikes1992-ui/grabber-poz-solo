/**
 * Session + PIN auth (Node runtime — API routes / server components).
 */

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { SessionRole, SessionUser } from './session-edge';
import { COOKIE_NAME, MAX_AGE_SEC as EDGE_MAX } from './session-constants';

export type { SessionRole, SessionUser };
export { COOKIE_NAME } from './session-constants';

const MAX_AGE_SEC = EDGE_MAX;

function authSecret(): string {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET is required in production');
    }
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

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPin(pin: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  if (stored.startsWith('TEMP$')) {
    return pin === stored.slice(5);
  }
  if (!stored.startsWith('scrypt$')) {
    if (process.env.NODE_ENV === 'production') return false;
    return pin === stored;
  }
  const [, salt, hash] = stored.split('$');
  const candidate = scryptSync(pin, salt, 32).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
  } catch {
    return false;
  }
}

export function isTemporaryCredential(stored: string | null | undefined): boolean {
  return Boolean(stored?.startsWith('TEMP$'));
}

export function encodeSession(user: SessionUser): string {
  const body = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const payloadB64 = b64url(JSON.stringify(body));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function decodeSession(token: string | undefined | null): SessionUser | null {
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
    const body = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionUser & {
      exp: number;
    };
    if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      userId: body.userId,
      email: body.email,
      name: body.name,
      role: body.role,
      mustRotateCredentials: body.mustRotateCredentials,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, encodeSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE_NAME)?.value);
}

const MUTATING_ROLES: SessionRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE', 'ACCOUNTANT'];

export function assertRole(user: SessionUser | null, allowed: SessionRole[]): SessionUser {
  if (!user) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  if (!allowed.includes(user.role)) {
    throw Object.assign(new Error('Forbidden for role ' + user.role), { status: 403 });
  }
  return user;
}

export function assertCanMutateCommerce(user: SessionUser | null): SessionUser {
  return assertRole(user, MUTATING_ROLES);
}

export function isDemoUserId(id: string): boolean {
  return id === '00000000-0000-0000-0000-000000000001';
}
