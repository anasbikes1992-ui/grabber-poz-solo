import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { deleteCollectionItem, listCollection, upsertCollectionItem } from '@/lib/db/app-collections';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const quotes = await listCollection<{ id: string } & Record<string, unknown>>('quotations');
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
    const cleanQuoteNo = body.quoteNo || `QT-${Math.floor(1000 + Math.random() * 9000)}`;
    const items = Array.isArray(body.lines) ? body.lines : [];
    const subtotal = items.reduce(
      (acc: number, it: { price?: number; qty?: number }) =>
        acc + Number(it.price || 0) * Number(it.qty || 1),
      0,
    );
    const tax = Number(body.taxAmount) || 0;
    const disc = Number(body.discountAmount) || 0;
    const grandTotal = Math.max(0, subtotal + tax - disc);

    const payload = {
      id: `quote_${cleanQuoteNo}`,
      quoteNo: cleanQuoteNo,
      clientName: String(body.clientName || '').trim(),
      clientPhone: body.clientPhone ? String(body.clientPhone).trim() : '',
      clientEmail: body.clientEmail ? String(body.clientEmail).trim() : '',
      validUntil: body.validUntil || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      lines: items,
      subtotal,
      taxAmount: tax,
      discountAmount: disc,
      grandTotal,
      notes: body.notes || '',
      status: 'ISSUED' as const,
      createdAt: new Date().toISOString(),
    };

    await upsertCollectionItem('quotations', payload);
    return NextResponse.json({ success: true, quote: payload });
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
    await deleteCollectionItem('quotations', id);
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
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const quotes = await listCollection<{ id: string } & Record<string, unknown>>('quotations');
    const existing = quotes.find((q) => q.id === body.id);
    if (!existing) return NextResponse.json({ success: false, error: 'Quote not found' }, { status: 404 });
    const payload = {
      ...existing,
      ...body,
      id: body.id,
      updatedAt: new Date().toISOString(),
    };
    await upsertCollectionItem('quotations', payload);
    return NextResponse.json({ success: true, quote: payload });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
