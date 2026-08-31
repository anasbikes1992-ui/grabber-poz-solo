import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db, stockBalances, stockMovements, transfers, transferLines } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';

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

        const updated = await tx
          .update(stockBalances)
          .set({
            onHand: sql`${stockBalances.onHand} - ${qty}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(stockBalances.locationType, fromLocationType),
              eq(stockBalances.locationId, fromLocationId),
              eq(stockBalances.productId, item.productId),
              sql`(${stockBalances.onHand} - ${stockBalances.reserved}) >= ${qty}`
            )
          )
          .returning({ id: stockBalances.id });

        if (updated.length === 0) {
          throw new Error(`Insufficient stock for ${item.productId} at source`);
        }

        const destUpdated = await tx
          .update(stockBalances)
          .set({
            onHand: sql`${stockBalances.onHand} + ${qty}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(stockBalances.locationType, toLocationType),
              eq(stockBalances.locationId, toLocationId),
              eq(stockBalances.productId, item.productId)
            )
          )
          .returning({ id: stockBalances.id });

        if (destUpdated.length === 0) {
          await tx.insert(stockBalances).values({
            locationType: toLocationType,
            locationId: toLocationId,
            productId: item.productId,
            variantId: item.variantId || null,
            onHand: qty,
            reserved: 0,
            damaged: 0,
          });
        }

        await tx.insert(transferLines).values({
          transferId: tr.id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: qty,
        });

        await tx.insert(stockMovements).values([
          {
            locationType: fromLocationType,
            locationId: fromLocationId,
            productId: item.productId,
            variantId: item.variantId || null,
            type: 'TRANSFER_OUT',
            delta: -qty,
            referenceType: 'TRANSFER',
            referenceId: tr.id,
            actorId: actorId || null,
          },
          {
            locationType: toLocationType,
            locationId: toLocationId,
            productId: item.productId,
            variantId: item.variantId || null,
            type: 'TRANSFER_IN',
            delta: qty,
            referenceType: 'TRANSFER',
            referenceId: tr.id,
            actorId: actorId || null,
          },
        ]);
      }

      return tr;
    });

    return NextResponse.json({ success: true, transfer: result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}
