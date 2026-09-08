import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession, requireStaffSession } from '@/lib/auth/session';
import { bumpKdsTicket, getKdsState, reopenKdsTicket } from '@/lib/restaurant/restaurant-service';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const station = searchParams.get('station') || 'ALL';

    const state = await getKdsState(station);
    return NextResponse.json({ success: true, ...state });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const action = body.action || 'bump';
    const ticketId = String(body.ticketId || '');
    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'ticketId required' }, { status: 400 });
    }

    if (action === 'bump') {
      const result = await bumpKdsTicket(ticketId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'reopen') {
      const result = await reopenKdsTicket(ticketId);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: false, error: 'Unknown KDS action' }, { status: 400 });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}
