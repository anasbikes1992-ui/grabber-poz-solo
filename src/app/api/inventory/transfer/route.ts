import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, transferLines, transfers } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { recordTransfer } from '@/lib/inventory/stock-service';
import { createDraftTransfer, dispatchTransfer, receiveTransfer, cancelTransfer } from '@/lib/inventory/transfer-workflow';

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
    const rows = await db.select().from(transfers).orderBy(desc(transfers.createdAt)).limit(50);
    const result = [];
    for (const tr of rows) {
      const lines = await db.select().from(transferLines).where(eq(transferLines.transferId, tr.id));
      result.push({ ...tr, lines });
    }
    return NextResponse.json({ success: true, transfers: result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

/** Create transfer — action=instant (legacy RECEIVED) | draft | dispatch | receive */
export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const action = body.action || 'instant';
    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;

    const fromLocationType = (body.fromLocationType || 'WAREHOUSE') as 'WAREHOUSE' | 'BRANCH';
    const toLocationType = (body.toLocationType || 'BRANCH') as 'WAREHOUSE' | 'BRANCH';
    const fromLocationId = body.fromLocationId as string;
    const toLocationId = body.toLocationId as string;
    const items = (body.items || []) as Array<{ productId: string; quantity: number; variantId?: string; receivedQty?: number }>;
    const transferNumber = body.transferNumber || `TRF-${Date.now()}`;

    if (action === 'draft') {
      if (!fromLocationId || !toLocationId || !items.length) {
        return NextResponse.json({ success: false, error: 'from/to location and items required' }, { status: 400 });
      }
      const tr = await db.transaction(async (tx) =>
        createDraftTransfer(tx, {
          transferNumber,
          fromLocationType,
          fromLocationId,
          toLocationType,
          toLocationId,
          items,
          actorId,
        }),
      );
      return NextResponse.json({ success: true, transfer: tr });
    }

    if (action === 'dispatch') {
      const tr = await db.transaction(async (tx) => dispatchTransfer(tx, body.transferId, actorId));
      return NextResponse.json({ success: true, transfer: tr });
    }

    if (action === 'receive') {
      const tr = await db.transaction(async (tx) =>
        receiveTransfer(tx, body.transferId, items, actorId),
      );
      return NextResponse.json({ success: true, transfer: tr });
    }

    if (action === 'cancel') {
      const tr = await db.transaction(async (tx) =>
        cancelTransfer(tx, body.transferId, actorId),
      );
      return NextResponse.json({ success: true, transfer: tr });
    }

    // Legacy instant transfer (RECEIVED in one step)
    if (!fromLocationId || !toLocationId || !items.length) {
      return NextResponse.json({ success: false, error: 'from/to location and items required' }, { status: 400 });
    }

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
          receivedQty: qty,
          varianceQty: 0,
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
