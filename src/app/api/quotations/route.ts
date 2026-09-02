import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import {
  deleteQuotationById,
  handleQuotationPatch,
  handleQuotationPost,
  listQuotationsForApi,
} from '@/lib/quotations/quotation-route-service';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const quotes = await listQuotationsForApi();
    return NextResponse.json({ success: true, quotes });
  } catch (err) {
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
    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;
    const result = await handleQuotationPost(body, actorId);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    assertCanMutateCommerce(await getSession());
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    await deleteQuotationById(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }
    const body = await req.json();
    const actorId = session && !isDemoUserId(session.userId) ? session.userId : null;
    const result = await handleQuotationPatch(body, actorId);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
