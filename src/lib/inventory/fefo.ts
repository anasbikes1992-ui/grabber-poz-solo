import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { stockLots } from '@/db';
import type { DbTx } from '@/lib/inventory/stock-service';

/** Pick earliest-expiry lot and decrement qty (FEFO). Returns lot id if consumed. */
export async function consumeFefoLot(
  tx: DbTx,
  loc: { locationType: 'BRANCH' | 'WAREHOUSE'; locationId: string },
  productId: string,
  variantId: string | null | undefined,
  qty: number,
): Promise<string | null> {
  const need = Math.max(1, Math.floor(qty));
  const lotWhere = and(
    eq(stockLots.locationType, loc.locationType),
    eq(stockLots.locationId, loc.locationId),
    eq(stockLots.productId, productId),
    gt(stockLots.qtyOnHand, 0),
    variantId ? eq(stockLots.variantId, variantId) : sql`${stockLots.variantId} IS NULL`,
  );
  const lots = await tx.select().from(stockLots).where(lotWhere).orderBy(asc(stockLots.expiryDate), asc(stockLots.receivedAt));

  if (!lots.length) return null;

  let remaining = need;
  let firstLotId: string | null = null;
  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, lot.qtyOnHand);
    if (take <= 0) continue;
    if (!firstLotId) firstLotId = lot.id;
    await tx
      .update(stockLots)
      .set({ qtyOnHand: lot.qtyOnHand - take })
      .where(eq(stockLots.id, lot.id));
    remaining -= take;
  }
  return firstLotId;
}

/** Receive stock into a lot (GRN). */
export async function receiveStockLot(
  tx: DbTx,
  input: {
    batchCode: string;
    productId: string;
    variantId?: string | null;
    locationType: 'BRANCH' | 'WAREHOUSE';
    locationId: string;
    qty: number;
    expiryDate?: Date | null;
  },
) {
  const qty = Math.max(1, Math.floor(input.qty));
  const [existing] = await tx
    .select()
    .from(stockLots)
    .where(
      and(
        eq(stockLots.batchCode, input.batchCode),
        eq(stockLots.productId, input.productId),
        eq(stockLots.locationId, input.locationId),
      ),
    )
    .limit(1);

  if (existing) {
    await tx
      .update(stockLots)
      .set({ qtyOnHand: existing.qtyOnHand + qty })
      .where(eq(stockLots.id, existing.id));
    return existing.id;
  }

  const [row] = await tx
    .insert(stockLots)
    .values({
      batchCode: input.batchCode,
      productId: input.productId,
      variantId: input.variantId || null,
      locationType: input.locationType,
      locationId: input.locationId,
      qtyOnHand: qty,
      expiryDate: input.expiryDate || null,
    })
    .returning();
  return row.id;
}
