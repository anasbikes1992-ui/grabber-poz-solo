import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, appointments } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET() {
  try {
    const rows = await db.select().from(appointments).orderBy(desc(appointments.startsAt)).limit(100);
    return NextResponse.json({ success: true, appointments: rows });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, appointments: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
    const endsAt = body.endsAt
      ? new Date(body.endsAt)
      : new Date(startsAt.getTime() + 60 * 60 * 1000);

    const [row] = await db
      .insert(appointments)
      .values({
        customerName: String(body.customerName || '').trim(),
        phone: String(body.phone || '').trim(),
        service: String(body.service || '').trim(),
        specialist: body.specialist || null,
        startsAt,
        endsAt,
        fee: Number(body.fee || 0).toFixed(2),
        status: body.status || 'CONFIRMED',
        notes: body.notes || null,
        createdBy: session && !isDemoUserId(session.userId) ? session.userId : null,
      })
      .returning();
    return NextResponse.json({ success: true, appointment: row });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await actor();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const [row] = await db
      .update(appointments)
      .set({ status: body.status, notes: body.notes, updatedAt: new Date() })
      .where(eq(appointments.id, body.id))
      .returning();
    return NextResponse.json({ success: true, appointment: row });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
