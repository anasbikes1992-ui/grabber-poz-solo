import { NextResponse } from 'next/server';
import { db, appointments } from '@/db';
import { resolveCommissionPct } from '@/lib/salon/commission';

/**
 * VERT-S04 — Public salon booking (no staff session).
 * POST { customerName, phone, service, startsAt?, specialist?, fee?, notes? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const customerName = String(body.customerName || '').trim();
    const phone = String(body.phone || '').trim();
    const service = String(body.service || '').trim();
    if (!customerName || !phone || !service) {
      return NextResponse.json(
        { success: false, error: 'customerName, phone, and service are required' },
        { status: 400 },
      );
    }

    const startsAt = body.startsAt ? new Date(body.startsAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (Number.isNaN(startsAt.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid startsAt' }, { status: 400 });
    }
    const endsAt = body.endsAt
      ? new Date(body.endsAt)
      : new Date(startsAt.getTime() + 60 * 60 * 1000);

    const feeMap: Record<string, number> = {
      Haircut: 1500,
      'Beard Shave': 800,
      'Hair Color': 5500,
      'Blow Dry': 1200,
    };
    const fee = Number(body.fee ?? feeMap[service] ?? 1500);
    const specialist = body.specialist ? String(body.specialist) : 'Stylist';
    const commissionPct = resolveCommissionPct(specialist, body.commissionPct);

    const [row] = await db
      .insert(appointments)
      .values({
        customerName,
        phone,
        service,
        specialist,
        startsAt,
        endsAt,
        fee: fee.toFixed(2),
        commissionPct: commissionPct.toFixed(2),
        commissionAmount: '0.00',
        source: body.source === 'WHATSAPP' ? 'WHATSAPP' : 'PUBLIC',
        status: 'CONFIRMED',
        notes: body.notes ? String(body.notes) : null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      appointment: row,
      confirmationCode: `APT-${row.id.slice(0, 8).toUpperCase()}`,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    services: [
      { name: 'Haircut', fee: 1500, durationMin: 45 },
      { name: 'Beard Shave', fee: 800, durationMin: 30 },
      { name: 'Hair Color', fee: 5500, durationMin: 120 },
      { name: 'Blow Dry', fee: 1200, durationMin: 40 },
    ],
  });
}
