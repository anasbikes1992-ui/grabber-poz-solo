import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { createDraftInvoice, listInvoices, payInvoice, postInvoice } from '@/lib/finance/ap-invoices';

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
    const invoices = await listInvoices();
    return NextResponse.json({ success: true, invoices });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, invoices: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const invoice = await createDraftInvoice({ ...body, createdBy: session.userId });
    return NextResponse.json({ success: true, invoice });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const action = String(body.action || '').toLowerCase();
    if (action === 'post') {
      const invoice = await postInvoice(body.id, session.userId);
      return NextResponse.json({ success: true, invoice });
    }
    if (action === 'pay') {
      const result = await payInvoice(body.id, {
        amount: Number(body.amount),
        method: body.method,
        notes: body.notes,
        createdBy: session.userId,
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: false, error: 'action must be post|pay' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
