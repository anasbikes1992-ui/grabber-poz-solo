import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { db, users } from '@/db';
import { getSession, verifyPin } from '@/lib/auth/session';

/** Verify OWNER/MANAGER/ADMIN PIN without changing the active cashier session. */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const pin = String(body?.pin || '');
    if (pin.length < 4) {
      return NextResponse.json({ success: false, error: 'PIN required' }, { status: 400 });
    }

    // Already privileged — no second PIN needed for drawer/void/discount UI gates
    if (session.role === 'OWNER' || session.role === 'ADMIN' || session.role === 'MANAGER') {
      return NextResponse.json({
        success: true,
        supervisor: { id: session.userId, name: session.name, role: session.role },
      });
    }

    const privileged = await db
      .select()
      .from(users)
      .where(inArray(users.role, ['OWNER', 'ADMIN', 'MANAGER']));

    for (const supervisor of privileged) {
      if (supervisor.active && verifyPin(pin, supervisor.hashedPin)) {
        return NextResponse.json({
          success: true,
          supervisor: { id: supervisor.id, name: supervisor.name, role: supervisor.role },
        });
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid supervisor PIN' }, { status: 401 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: e.message || 'Verify failed' }, { status: 500 });
  }
}
