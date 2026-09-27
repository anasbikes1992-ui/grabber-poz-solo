/**
 * Lightweight in-memory rate limiter for Edge middleware and API routes.
 * Resets per server instance (acceptable MVP for abuse protection).
 */

type Bucket = { count: number; resetAt: number };
type AuthFailure = { count: number; blockedUntil: number };

const buckets = new Map<string, Bucket>();
const authFailures = new Map<string, AuthFailure>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { ok: true };
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

export function clientIpFromRequest(req: Request): string {
  return clientIpFromHeaders(req.headers);
}

function envInt(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function envMs(name: string, fallback: number) {
  const seconds = envInt(name, Math.ceil(fallback / 1000));
  return seconds * 1000;
}

export const AUTH_RATE_LIMIT = {
  ipLimit: envInt('RATE_LIMIT_AUTH_IP_LIMIT', 20),
  accountLimit: envInt('RATE_LIMIT_AUTH_ACCOUNT_LIMIT', 8),
  windowMs: envMs('RATE_LIMIT_AUTH_WINDOW_SECONDS', 60_000),
  backoffBaseMs: envMs('RATE_LIMIT_AUTH_BACKOFF_BASE_SECONDS', 30_000),
  backoffMaxMs: envMs('RATE_LIMIT_AUTH_BACKOFF_MAX_SECONDS', 15 * 60_000),
};

export const RATE_LIMIT_RULES = [
  { prefix: '/api/auth/login', limit: AUTH_RATE_LIMIT.ipLimit, windowMs: AUTH_RATE_LIMIT.windowMs },
  { prefix: '/api/auth/', limit: envInt('RATE_LIMIT_AUTH_PUBLIC_LIMIT', 30), windowMs: envMs('RATE_LIMIT_AUTH_PUBLIC_WINDOW_SECONDS', 60_000) },
  { prefix: '/api/company/leads', limit: envInt('RATE_LIMIT_PUBLIC_LEADS_LIMIT', 10), windowMs: envMs('RATE_LIMIT_PUBLIC_LEADS_WINDOW_SECONDS', 60_000) },
  { prefix: '/api/pos/checkout', limit: envInt('RATE_LIMIT_CHECKOUT_LIMIT', 60), windowMs: envMs('RATE_LIMIT_CHECKOUT_WINDOW_SECONDS', 60_000) },
  { prefix: '/api/seed', limit: envInt('RATE_LIMIT_SEED_LIMIT', 5), windowMs: envMs('RATE_LIMIT_SEED_WINDOW_SECONDS', 60_000) },
  { prefix: '/api/promotions/', limit: envInt('RATE_LIMIT_PROMOTIONS_LIMIT', 60), windowMs: envMs('RATE_LIMIT_PROMOTIONS_WINDOW_SECONDS', 60_000) },
  { prefix: '/api/jarvis/', limit: envInt('RATE_LIMIT_JARVIS_LIMIT', 30), windowMs: envMs('RATE_LIMIT_JARVIS_WINDOW_SECONDS', 60_000) },
  { prefix: '/api/repairs/public', limit: envInt('RATE_LIMIT_PUBLIC_REPAIRS_LIMIT', 20), windowMs: envMs('RATE_LIMIT_PUBLIC_REPAIRS_WINDOW_SECONDS', 60_000) },
  { prefix: '/api/agents/', limit: envInt('RATE_LIMIT_AGENTS_LIMIT', 15), windowMs: envMs('RATE_LIMIT_AGENTS_WINDOW_SECONDS', 60_000) },
  { prefix: '/api/restaurant/menu', limit: envInt('RATE_LIMIT_PUBLIC_MENU_LIMIT', 20), windowMs: envMs('RATE_LIMIT_PUBLIC_MENU_WINDOW_SECONDS', 60_000) },
] as const;

export function rateLimitResponse(retryAfterSec: number) {
  return {
    status: 429,
    body: { success: false, error: 'Too many requests', retryAfterSec },
    headers: { 'Retry-After': String(retryAfterSec) },
  };
}

export function checkPathRateLimit(pathname: string, ip: string): RateLimitResult {
  for (const rule of RATE_LIMIT_RULES) {
    if (pathname === rule.prefix.replace(/\/$/, '') || pathname.startsWith(rule.prefix)) {
      return checkRateLimit(`${rule.prefix}:${ip}`, rule.limit, rule.windowMs);
    }
  }
  return { ok: true };
}

export function checkAuthAccountRateLimit(accountKey: string): RateLimitResult {
  const normalized = accountKey.trim().toLowerCase();
  if (!normalized) return { ok: true };
  return checkRateLimit(`auth-account:${normalized}`, AUTH_RATE_LIMIT.accountLimit, AUTH_RATE_LIMIT.windowMs);
}

export function authBackoffSeconds(failureCount: number): number {
  if (failureCount <= AUTH_RATE_LIMIT.accountLimit) return 0;
  const power = Math.min(8, failureCount - AUTH_RATE_LIMIT.accountLimit);
  const delay = Math.min(
    AUTH_RATE_LIMIT.backoffMaxMs,
    AUTH_RATE_LIMIT.backoffBaseMs * Math.pow(2, power - 1),
  );
  return Math.max(1, Math.ceil(delay / 1000));
}

export function checkAuthBackoff(accountKey: string): RateLimitResult {
  const normalized = accountKey.trim().toLowerCase();
  if (!normalized) return { ok: true };
  const state = authFailures.get(normalized);
  const now = Date.now();
  if (!state || now >= state.blockedUntil) return { ok: true };
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil((state.blockedUntil - now) / 1000)) };
}

export function recordAuthFailure(accountKey: string): number {
  const normalized = accountKey.trim().toLowerCase();
  if (!normalized) return 0;
  const previous = authFailures.get(normalized);
  const count = (previous?.count ?? 0) + 1;
  const delaySec = authBackoffSeconds(count);
  authFailures.set(normalized, {
    count,
    blockedUntil: delaySec ? Date.now() + delaySec * 1000 : 0,
  });
  return delaySec;
}

export function clearAuthFailures(accountKey: string) {
  const normalized = accountKey.trim().toLowerCase();
  if (normalized) authFailures.delete(normalized);
}
