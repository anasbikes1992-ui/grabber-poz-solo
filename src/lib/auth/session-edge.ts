/**
 * Edge-safe session decode for middleware (HMAC via Web Crypto).
 * Full Node PIN hashing lives in session.ts.
 */

export const COOKIE_NAME = 'grabber_session';

export type SessionRole =
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'CASHIER'
  | 'WAREHOUSE'
  | 'ACCOUNTANT'
  | 'MARKETING';

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: SessionRole;
  mustRotateCredentials?: boolean;
}

function authSecret(): string | null {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') return null;
  return 'dev-only-insecure-auth-secret-change-me';
}

function b64urlFromString(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSign(payloadB64: string): Promise<string> {
  const secret = authSecret();
  if (!secret) throw new Error('AUTH_SECRET is required in production');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const bytes = new Uint8Array(sig);
  let str = '';
  bytes.forEach((b) => {
    str += String.fromCharCode(b);
  });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function encodeSessionEdge(user: SessionUser, maxAgeSec = 43200): Promise<string> {
  const body = { ...user, exp: Math.floor(Date.now() / 1000) + maxAgeSec };
  const payloadB64 = b64urlFromString(JSON.stringify(body));
  const sig = await hmacSign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function decodeSessionEdge(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  if (!authSecret()) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  let expected: string;
  try {
    expected = await hmacSign(payloadB64);
  } catch {
    return null;
  }
  if (expected.length !== sig.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (mismatch !== 0) return null;
  try {
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const body = JSON.parse(json) as SessionUser & { exp: number };
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
