import { NextResponse } from 'next/server';
import { db, transfers, transferLines } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { recordTransfer } from '@/lib/inventory/stock-service';

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const {
      fromLocationType = 'WAREHOUSE',
      fromLocationId,
      toLocationType = 'BRANCH',
      toLocationId,
      items = [],
      transferNumber = `TRF-${Date.now()}`,
    } = body as {
      fromLocationType?: 'WAREHOUSE' | 'BRANCH';
      fromLocationId: string;
      toLocationType?: 'WAREHOUSE' | 'BRANCH';
      toLocationId: string;
      items: Array<{ productId: string; quantity: number; variantId?: string }>;
      transferNumber?: string;
    };

    if (!fromLocationId || !toLocationId || !items.length) {
      return NextResponse.json({ success: false, error: 'from/to location and items required' }, { status: 400 });
    }

    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;

    const result = await db.transaction(async (tx) => {
      const [tr] = await tx
        .insert(transfers)
        .values({
          transferNumber,
          fromLocationType,
          fromLocationId,
          toLocationType,
          toLocationId,
          status: 'RECEIVED',
          requestedBy: actorId || null,
          receivedBy: actorId || null,
        })
        .returning();

      for (const item of items) {
        const qty = Number(item.quantity);
        if (!qty || qty < 1) throw new Error('Invalid quantity');

        await recordTransfer(
          tx,
          { locationType: fromLocationType, locationId: fromLocationId },
          { locationType: toLocationType, locationId: toLocationId },
          { productId: item.productId, variantId: item.variantId || null, quantity: qty },
          {
            referenceType: 'TRANSFER',
            referenceId: tr.id,
            actorId: actorId || null,
          },
        );

        await tx.insert(transferLines).values({
          transferId: tr.id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: qty,
        });
      }

      return tr;
    });

    return NextResponse.json({ success: true, transfer: result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}
