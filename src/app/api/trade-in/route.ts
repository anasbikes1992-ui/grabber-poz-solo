import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, branches, tradeInVouchers } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { applyTradeInCredit, issueTradeInVoucher, type ConditionGrade } from '@/lib/trade-in/trade-in-service';

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
    const rows = await db.select().from(tradeInVouchers).orderBy(desc(tradeInVouchers.createdAt)).limit(50);
    return NextResponse.json({ success: true, vouchers: rows });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const action = body.action || 'issue';

    if (action === 'apply') {
      const credit = await applyTradeInCredit(db, body.voucherNumber, body.orderId);
      if (!credit) return NextResponse.json({ success: false, error: 'Voucher not found or already used' }, { status: 404 });
      return NextResponse.json({ success: true, ...credit });
    }

    let locationId = body.locationId as string | undefined;
    if (!locationId) {
      const [branch] = await db.select().from(branches).limit(1);
      locationId = branch?.id;
    }
    if (!locationId) return NextResponse.json({ success: false, error: 'No branch configured' }, { status: 400 });

    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;
    const result = await issueTradeInVoucher(db, {
      deviceModel: String(body.deviceModel || ''),
      imei: body.imei,
      conditionGrade: (body.conditionGrade || 'B') as ConditionGrade,
      baseValue: Number(body.baseValue || 0),
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      preOwnedProductId: body.preOwnedProductId,
      locationId,
      actorId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
