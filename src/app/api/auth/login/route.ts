import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, users } from '@/db';
import {
  clearSessionCookie,
  hashPin,
  isTemporaryCredential,
  setSessionCookie,
  verifyPin,
  type SessionRole,
} from '@/lib/auth/session';
import {
  checkAuthAccountRateLimit,
  checkAuthBackoff,
  clientIpFromRequest,
  clearAuthFailures,
  rateLimitResponse,
  recordAuthFailure,
} from '@/lib/security/rate-limit';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';

const loginSchema = z.object({
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  pin: z.string().trim().regex(/^\d{4,12}$/, 'PIN must be 4 to 12 digits'),
  role: z.string().trim().max(32).optional(),
});

const rotateSchema = z.object({
  email: z.string().trim().email().max(254),
  currentPin: z.string().trim().regex(/^\d{4,12}$/),
  newPin: z.string().trim().regex(/^\d{4,12}$/),
});

function genericAuthError(status = 401) {
  return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status });
}

export async function POST(req: Request) {
  let accountKey = '';
  try {
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid login request');
    }
    const { email, pin, role } = parsed.data;

    // Normalize role string (e.g. 'CREATIVE' -> 'MARKETING')
    const normalizedRole: SessionRole | undefined = role
      ? role.toUpperCase() === 'CREATIVE'
        ? 'MARKETING'
      : (role.toUpperCase() as SessionRole)
      : undefined;

    // Prefer email lookup; fallback to first active user matching role
    let user;
    const cleanEmail = email?.trim()?.toLowerCase();
    accountKey = cleanEmail || normalizedRole || clientIpFromRequest(req);

    const accountLimited = checkAuthAccountRateLimit(accountKey);
    if (!accountLimited.ok) {
      return NextResponse.json(rateLimitResponse(accountLimited.retryAfterSec).body, {
        status: 429,
        headers: rateLimitResponse(accountLimited.retryAfterSec).headers,
      });
    }

    const backoff = checkAuthBackoff(accountKey);
    if (!backoff.ok) {
      return NextResponse.json(
        { success: false, error: 'Too many failed attempts', retryAfterSec: backoff.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(backoff.retryAfterSec) } },
      );
    }

    if (cleanEmail) {
      const [row] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
      user = row;

      // Strict role enforcement: reject role claim mismatch
      if (user && normalizedRole && user.role !== normalizedRole) {
        recordAuthFailure(accountKey);
        return genericAuthError();
      }
    } else if (normalizedRole) {
      const rows = await db.select().from(users).where(eq(users.role, normalizedRole)).limit(10);
      user = rows.find((u) => u.active) || rows[0];
    }

    // Dev-only bootstrap — never mint sessions from PIN alone in production
    const allowDemoPin =
      process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_PIN !== '0';
    if (allowDemoPin && pin === '1234') {
      const demoRole = normalizedRole || (user ? (user.role as SessionRole) : 'OWNER');
      const demoEmail = user?.email || cleanEmail || `${demoRole.toLowerCase()}@store.local`;
      const demoName = user?.name || `Demo ${demoRole}`;
      const demoId = user?.id || '00000000-0000-0000-0000-000000000001';

      await setSessionCookie({
        userId: demoId,
        email: demoEmail,
        name: demoName,
        role: demoRole,
        mustRotateCredentials: false,
      });

      return NextResponse.json({
        success: true,
        demo: true,
        mustRotateCredentials: false,
        user: { id: demoId, email: demoEmail, name: demoName, role: demoRole },
      });
    }

    if (!user) {
      recordAuthFailure(accountKey);
      return genericAuthError();
    }

    if (!user.active) {
      recordAuthFailure(accountKey);
      return genericAuthError(403);
    }

    if (!verifyPin(String(pin), user.hashedPin)) {
      recordAuthFailure(accountKey);
      return genericAuthError();
    }

    const mustRotate = isTemporaryCredential(user.hashedPin);
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as SessionRole,
      mustRotateCredentials: mustRotate,
    });
    clearAuthFailures(accountKey);

    return NextResponse.json({
      success: true,
      mustRotateCredentials: mustRotate,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err: unknown) {
    return publicErrorResponse(err, { message: 'Login failed', logMessage: 'Login failed' });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}

/** Rotate temporary PIN */
export async function PATCH(req: Request) {
  try {
    const parsed = rotateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid request');
    }
    const { email, currentPin, newPin } = parsed.data;
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !verifyPin(currentPin, user.hashedPin)) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }
    await db
      .update(users)
      .set({ hashedPin: hashPin(String(newPin)), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as SessionRole,
      mustRotateCredentials: false,
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return publicErrorResponse(err, { message: 'Rotate failed', logMessage: 'PIN rotate failed' });
  }
}
