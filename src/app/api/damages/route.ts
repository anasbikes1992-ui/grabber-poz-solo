import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { deleteCollectionItem, listCollection, upsertCollectionItem } from '@/lib/db/app-collections';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const damages = await listCollection<{ id: string } & Record<string, unknown>>('damages');
    return NextResponse.json({ success: true, damages });
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
    if (!body.productName || !body.quantity) {
      return NextResponse.json({ success: false, error: 'Product and quantity are required' }, { status: 400 });
    }

    const numQty = Number(body.quantity) || 1;
    const numCost = Number(body.unitCost) || 0;
    const payload = {
      id: `dmg_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      productName: String(body.productName).trim(),
      barcode: body.barcode ? String(body.barcode).trim() : '',
      quantity: numQty,
      unitCost: numCost,
      totalLoss: numQty * numCost,
      reason: body.reason || 'DAMAGED_IN_STORE',
      remarks: body.remarks || '',
      reportedBy: body.reportedBy || session?.name || 'Store Manager',
      recordedAt: new Date().toISOString(),
    };

    await upsertCollectionItem('damages', payload);
    return NextResponse.json({ success: true, damage: payload });
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
    await deleteCollectionItem('damages', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
