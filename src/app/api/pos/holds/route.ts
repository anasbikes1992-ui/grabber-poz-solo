import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import {
  createPosHold,
  deletePosHold,
  getPosHold,
  listPosHolds,
} from '@/lib/db/repositories/pos-holds-repo';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || undefined;
    const holdId = searchParams.get('id');

    if (holdId) {
      const hold = await getPosHold(holdId);
      if (!hold) return NextResponse.json({ success: false, error: 'Hold not found' }, { status: 404 });
      return NextResponse.json({ success: true, hold });
    }

    const holds = await listPosHolds(branchId);
    return NextResponse.json({ success: true, holds });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'dev@localhost',
        name: 'Dev',
        role: 'OWNER',
      };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const branchId = body.branchId as string;
    if (!branchId) {
      return NextResponse.json({ success: false, error: 'branchId required' }, { status: 400 });
    }

    const items = Array.isArray(body.items) ? body.items : [];
    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;

    const result = await createPosHold({
      branchId,
      shiftId: body.shiftId,
      actorId,
      label: body.label,
      items,
      discountTotal: body.discountTotal,
    });

    return NextResponse.json({ success: true, hold: result.order, grandTotal: result.grandTotal });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'dev@localhost',
        name: 'Dev',
        role: 'OWNER',
      };
    } else {
      assertCanMutateCommerce(session);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const ok = await deletePosHold(id);
    if (!ok) return NextResponse.json({ success: false, error: 'Hold not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
