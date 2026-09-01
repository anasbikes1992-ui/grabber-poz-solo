import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { releaseStock, reserveStock } from '@/lib/inventory/stock-reservation';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const productId = String(body.productId || '');
    const referenceId = String(body.referenceId || body.orderId || '');
    const referenceType = String(body.referenceType || 'HOLD');

    if (!productId || !referenceId) {
      return NextResponse.json({ success: false, error: 'productId and referenceId required' }, { status: 400 });
    }

    const result = await reserveStock({
      branchId: body.branchId,
      productId,
      variantId: body.variantId || null,
      qty: Number(body.qty ?? 1),
      referenceType,
      referenceId,
      actorId: session && !isDemoUserId(session.userId) ? session.userId : null,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const productId = String(body.productId || '');
    const referenceId = String(body.referenceId || body.orderId || '');

    if (!productId || !referenceId) {
      return NextResponse.json({ success: false, error: 'productId and referenceId required' }, { status: 400 });
    }

    const result = await releaseStock({
      branchId: body.branchId,
      productId,
      variantId: body.variantId || null,
      qty: Number(body.qty ?? 1),
      referenceType: String(body.referenceType || 'HOLD'),
      referenceId,
      actorId: session && !isDemoUserId(session.userId) ? session.userId : null,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
