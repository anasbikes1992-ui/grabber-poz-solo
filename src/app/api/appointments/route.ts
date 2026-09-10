import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, appointments } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { resolveCommissionPct } from '@/lib/salon/commission';

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
    await actor();
    const rows = await db.select().from(appointments).orderBy(desc(appointments.startsAt)).limit(100);
    return NextResponse.json({ success: true, appointments: rows });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json(
      { success: false, error: e.message || 'Unauthorized', appointments: [] },
      { status: e.status || 401 },
    );
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
        commissionPct: resolveCommissionPct(body.specialist, body.commissionPct).toFixed(2),
        source: body.source || 'STAFF',
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
    const session = await actor();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    if (body.status === 'COMPLETED' && body.charge !== false) {
      const { completeAppointmentAndCharge } = await import('@/lib/salon/complete-appointment');
      try {
        const result = await completeAppointmentAndCharge({
          appointmentId: body.id,
          productId: body.productId,
          paymentMethod: body.paymentMethod || 'CASH',
          actorId: session.userId,
        });
        return NextResponse.json({ success: true, ...result, charged: true });
      } catch (chargeErr) {
        // Fall through to status-only update if catalog missing (dev / non-salon)
        if (body.requireCharge) {
          throw chargeErr;
        }
      }
    }

    const [row] = await db
      .update(appointments)
      .set({
        status: body.status,
        notes: body.notes,
        customerName: body.customerName,
        phone: body.phone,
        service: body.service,
        specialist: body.specialist,
        fee: body.fee != null ? Number(body.fee).toFixed(2) : undefined,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, body.id))
      .returning();
    return NextResponse.json({ success: true, appointment: row, charged: false });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    await actor();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || (await req.json().catch(() => ({}))).id;
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    await db.delete(appointments).where(eq(appointments.id, String(id)));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
