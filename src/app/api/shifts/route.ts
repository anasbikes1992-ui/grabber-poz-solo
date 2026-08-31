import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { closeShift, getOpenShift, listRecentShifts, openShift } from '@/lib/db/repositories/shifts-repo';
import { ESCPOSPrinterController } from '@/lib/hardware/printer';
import { db, users } from '@/db';
import { eq } from 'drizzle-orm';

async function resolveActor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

async function resolveCashierId(sessionUserId: string, bodyCashierId?: string) {
  if (bodyCashierId && !isDemoUserId(bodyCashierId)) return bodyCashierId;
  if (!isDemoUserId(sessionUserId)) return sessionUserId;
  const [u] = await db.select().from(users).where(eq(users.role, 'OWNER')).limit(1);
  if (!u) throw new Error('Seed an OWNER user before opening a shift (POST /api/seed)');
  return u.id;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const registerId = searchParams.get('registerId') || undefined;
    const openShiftRow = await getOpenShift(registerId);
    const recent = await listRecentShifts(10);
    return NextResponse.json({
      success: true,
      openShift: openShiftRow,
      shifts: openShiftRow ? [openShiftRow, ...recent.filter((s) => s.id !== openShiftRow.id)] : recent,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await resolveActor();
    const body = await req.json();
    const cashierId = await resolveCashierId(session.userId, body.cashierId);
    const result = await openShift({
      registerId: body.registerId,
      branchId: body.branchId,
      cashierId,
      openingFloat: Number(body.openingFloat ?? 0),
    });
    return NextResponse.json({ success: true, shift: result.shift, reused: result.reused });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}
