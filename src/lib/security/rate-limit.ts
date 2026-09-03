/**
 * Lightweight in-memory rate limiter for Edge middleware and API routes.
 * Resets per server instance (acceptable MVP for abuse protection).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

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

export const RATE_LIMIT_RULES = [
  { prefix: '/api/auth/login', limit: 20, windowMs: 60_000 },
  { prefix: '/api/pos/checkout', limit: 60, windowMs: 60_000 },
  { prefix: '/api/seed', limit: 5, windowMs: 60_000 },
  { prefix: '/api/promotions/', limit: 60, windowMs: 60_000 },
  { prefix: '/api/jarvis/', limit: 30, windowMs: 60_000 },
  { prefix: '/api/repairs/public', limit: 20, windowMs: 60_000 },
  { prefix: '/api/agents/', limit: 15, windowMs: 60_000 },
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
