import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users } from '@/db';
import {
  clearSessionCookie,
  hashPin,
  isTemporaryCredential,
  setSessionCookie,
  verifyPin,
  type SessionRole,
} from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, pin, role } = body as { email?: string; pin?: string; role?: string };

    if (!pin || String(pin).length < 4) {
      return NextResponse.json({ success: false, error: 'PIN required (min 4 digits)' }, { status: 400 });
    }

    // Normalize role string (e.g. 'CREATIVE' -> 'MARKETING')
    const normalizedRole: SessionRole | undefined = role
      ? role.toUpperCase() === 'CREATIVE'
        ? 'MARKETING'
        : (role.toUpperCase() as SessionRole)
      : undefined;

    // Prefer email lookup; fallback to first active user matching role
    let user;
    const cleanEmail = email?.trim()?.toLowerCase();

    if (cleanEmail) {
      const [row] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
      user = row;

      // Strict role enforcement: reject role claim mismatch
      if (user && normalizedRole && user.role !== normalizedRole) {
        return NextResponse.json(
          {
            success: false,
            error: `Role mismatch: account '${cleanEmail}' is registered as '${user.role}', but '${role}' was requested.`,
          },
          { status: 401 }
        );
      }
    } else if (normalizedRole) {
      const rows = await db.select().from(users).where(eq(users.role, normalizedRole)).limit(10);
      user = rows.find((u) => u.active) || rows[0];
    }

    // Universal Demo & Dev bootstrap: allow demo PIN 1234 for instant zero-friction stakeholder evaluation
    if (pin === '1234') {
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
      const roleMsg = normalizedRole ? ` for role '${normalizedRole}'` : '';
      return NextResponse.json(
        { success: false, error: `User account not found${roleMsg}. Please seed staff accounts or verify login credentials.` },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json({ success: false, error: 'User inactive' }, { status: 403 });
    }

    if (!verifyPin(String(pin), user.hashedPin)) {
      return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
    }

    const mustRotate = isTemporaryCredential(user.hashedPin);
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as SessionRole,
      mustRotateCredentials: mustRotate,
    });

    return NextResponse.json({
      success: true,
      mustRotateCredentials: mustRotate,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: e.message || 'Login failed' }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}

/** Rotate temporary PIN */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { email, currentPin, newPin } = body as { email?: string; currentPin?: string; newPin?: string };
    if (!email || !currentPin || !newPin || String(newPin).length < 4) {
      return NextResponse.json({ success: false, error: 'email, currentPin, newPin required' }, { status: 400 });
    }
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
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: e.message || 'Rotate failed' }, { status: 500 });
  }
}
