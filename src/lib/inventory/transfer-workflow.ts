import { eq } from 'drizzle-orm';
import { transferLines, transfers } from '@/db/schema';
import { recordTransfer } from '@/lib/inventory/stock-service';

export type TransferItem = {
  productId: string;
  variantId?: string;
  quantity: number;
  receivedQty?: number;
};

export async function createDraftTransfer(
  tx: Parameters<typeof recordTransfer>[0],
  input: {
    transferNumber: string;
    fromLocationType: 'BRANCH' | 'WAREHOUSE';
    fromLocationId: string;
    toLocationType: 'BRANCH' | 'WAREHOUSE';
    toLocationId: string;
    items: TransferItem[];
    actorId?: string;
  },
) {
  if (input.fromLocationType === input.toLocationType && input.fromLocationId === input.toLocationId) {
    throw new Error('Source and destination locations must be different');
  }

  const [tr] = await tx
    .insert(transfers)
    .values({
      transferNumber: input.transferNumber,
      fromLocationType: input.fromLocationType,
      fromLocationId: input.fromLocationId,
      toLocationType: input.toLocationType,
      toLocationId: input.toLocationId,
      status: 'DRAFT',
      requestedBy: input.actorId || null,
    })
    .returning();

  for (const item of input.items) {
    await tx.insert(transferLines).values({
      transferId: tr.id,
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: item.quantity,
    });
  }
  return tr;
}

/** DISPATCHED: deduct source, mark IN_TRANSIT (no destination add yet). */
export async function dispatchTransfer(
  tx: Parameters<typeof recordTransfer>[0],
  transferId: string,
  actorId?: string,
) {
  const [tr] = await tx.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
  if (!tr) throw new Error('Transfer not found');
  if (tr.status !== 'DRAFT' && tr.status !== 'REQUESTED' && tr.status !== 'APPROVED') {
    throw new Error(`Cannot dispatch from status ${tr.status}`);
  }

  const lines = await tx.select().from(transferLines).where(eq(transferLines.transferId, transferId));
  for (const line of lines) {
    await recordTransfer(
      tx,
      { locationType: tr.fromLocationType, locationId: tr.fromLocationId },
      { locationType: tr.toLocationType, locationId: tr.toLocationId },
      {
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
      },
      { referenceType: 'TRANSFER_DISPATCH', referenceId: transferId, actorId: actorId || null },
      { skipDestinationCredit: true },
    );
  }

  const [updated] = await tx
    .update(transfers)
    .set({ status: 'IN_TRANSIT' })
    .where(eq(transfers.id, transferId))
    .returning();
  return updated;
}

/** RECEIVED: add to destination, log variance if receivedQty differs. */
export async function receiveTransfer(
  tx: Parameters<typeof recordTransfer>[0],
  transferId: string,
  receivedItems: TransferItem[],
  actorId?: string,
) {
  const [tr] = await tx.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
  if (!tr) throw new Error('Transfer not found');
  if (tr.status !== 'IN_TRANSIT' && tr.status !== 'DISPATCHED') {
    throw new Error(`Cannot receive from status ${tr.status}`);
  }

  const lines = await tx.select().from(transferLines).where(eq(transferLines.transferId, transferId));
  const receivedMap = new Map(receivedItems.map((i) => [`${i.productId}:${i.variantId || ''}`, i]));

  for (const line of lines) {
    const key = `${line.productId}:${line.variantId || ''}`;
    const recv = receivedMap.get(key);
    const receivedQty = recv?.receivedQty ?? recv?.quantity ?? line.quantity;
    const varianceQty = receivedQty - line.quantity;

    await recordTransfer(
      tx,
      { locationType: tr.fromLocationType, locationId: tr.fromLocationId },
      { locationType: tr.toLocationType, locationId: tr.toLocationId },
      {
        productId: line.productId,
        variantId: line.variantId,
        quantity: receivedQty,
      },
      {
        referenceType: 'TRANSFER_RECEIVE',
        referenceId: transferId,
        actorId: actorId || null,
        notes: varianceQty !== 0 ? `Variance ${varianceQty}` : undefined,
      },
      { skipSourceDebit: true },
    );

    await tx
      .update(transferLines)
      .set({ receivedQty, varianceQty })
      .where(eq(transferLines.id, line.id));
  }

  const [updated] = await tx
    .update(transfers)
    .set({ status: 'RECEIVED', receivedBy: actorId || null })
    .where(eq(transfers.id, transferId))
    .returning();
  return updated;
}

/** CANCELLED: cancel a draft or requested transfer without mutating inventory. */
export async function cancelTransfer(
  tx: Parameters<typeof recordTransfer>[0],
  transferId: string,
  actorId?: string,
) {
  const [tr] = await tx.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
  if (!tr) throw new Error('Transfer not found');
  if (tr.status !== 'DRAFT' && tr.status !== 'REQUESTED' && tr.status !== 'APPROVED') {
    throw new Error(`Cannot cancel transfer in status ${tr.status}. Only un-dispatched transfers can be cancelled.`);
  }

  const [updated] = await tx
    .update(transfers)
    .set({ status: 'CANCELLED' })
    .where(eq(transfers.id, transferId))
    .returning();
  return updated;
}

