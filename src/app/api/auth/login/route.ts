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

    // Prefer email lookup; fallback to first active user matching role
    let user;
    if (email) {
      const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      user = row;
    } else if (role) {
      const rows = await db.select().from(users).where(eq(users.role, role as SessionRole)).limit(5);
      user = rows.find((u) => u.active) || rows[0];
    }

    // Dev bootstrap: if no users exist, allow demo OWNER with pin 1234 and create temp user is NOT done here —
    // require seeded users. In development without DB user, accept demo session.
    if (!user) {
      if (process.env.NODE_ENV !== 'production' && pin === '1234') {
        await setSessionCookie({
          userId: '00000000-0000-0000-0000-000000000001',
          email: email || 'owner@localhost',
          name: 'Demo Owner',
          role: (role as SessionRole) || 'OWNER',
          mustRotateCredentials: true,
        });
        return NextResponse.json({
          success: true,
          demo: true,
          mustRotateCredentials: true,
          user: { role: role || 'OWNER', name: 'Demo Owner' },
        });
      }
      return NextResponse.json({ success: false, error: 'User not found. Seed an OWNER account.' }, { status: 401 });
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
