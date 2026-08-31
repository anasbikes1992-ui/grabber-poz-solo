import { NextResponse } from 'next/server';
import { durablePolimRepay } from '@/lib/db/repositories/checkout-repo';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    assertCanMutateCommerce(session);
    const body = await req.json();
    const { customerId, amount, paymentMethod = 'CASH', notes } = body;
    if (!customerId || amount == null) {
      return NextResponse.json({ success: false, error: 'customerId and amount required' }, { status: 400 });
    }
    const result = await durablePolimRepay({
      customerId,
      amount: Number(amount),
      paymentMethod,
      notes,
      actorId: session!.userId,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Repay failed' }, { status: e.status || 400 });
  }
}
