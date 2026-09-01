import { NextResponse } from 'next/server';
import { listCollection, upsertCollectionItem } from '@/lib/db/app-collections';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const warranties = await listCollection<{ id: string } & Record<string, unknown>>('warranties');
    return NextResponse.json({ success: true, warranties });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message, warranties: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: 'dev', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const serial = String(body.serial || '').trim();
    const productName = String(body.productName || '').trim();
    const customerName = String(body.customerName || '').trim();
    if (!serial || !productName || !customerName) {
      return NextResponse.json({ success: false, error: 'serial, productName, and customerName required' }, { status: 400 });
    }

    const expiresAt =
      body.expiresAt ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const item = await upsertCollectionItem('warranties', {
      id: body.id || `wty_${Date.now()}`,
      serial,
      productName,
      customerName,
      expiresAt,
      notes: body.notes || null,
      createdAt: new Date().toISOString(),
      registeredBy: session!.userId,
    });

    return NextResponse.json({ success: true, warranty: item });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
