import { NextResponse } from 'next/server';
import { getSession, requireStaffSession, assertCanMutateCommerce } from '@/lib/auth/session';
import { getCreativeCredits, setCreativeCredits } from '@/lib/creative/credit-meter';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const credits = await getCreativeCredits();
    return NextResponse.json({ success: true, credits });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

/** Staff can top up / reset monthly counter */
export async function POST(req: Request) {
  try {
    assertCanMutateCommerce(await requireStaffSession());
    const body = await req.json();
    const credits = await setCreativeCredits({
      balance: body.balance != null ? Number(body.balance) : undefined,
      used: body.used != null ? Number(body.used) : undefined,
      periodLabel: body.periodLabel ? String(body.periodLabel) : undefined,
    });
    return NextResponse.json({ success: true, credits });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
