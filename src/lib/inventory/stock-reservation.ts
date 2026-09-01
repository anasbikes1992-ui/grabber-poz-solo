import { and, eq, sql } from 'drizzle-orm';
import { db, branches, products, stockBalances, stockMovements } from '@/db';

export type StockReservationInput = {
  branchId?: string;
  productId: string;
  variantId?: string | null;
  qty: number;
  referenceType: string;
  referenceId: string;
  actorId?: string | null;
  notes?: string;
};

async function resolveBranchId(branchId?: string): Promise<string> {
  if (branchId) return branchId;
  const [branch] = await db.select({ id: branches.id }).from(branches).limit(1);
  if (!branch) throw new Error('No branch configured');
  return branch.id;
}

export async function reserveStock(input: StockReservationInput) {
  const qty = Math.max(1, Math.floor(Number(input.qty) || 1));
  const branchId = await resolveBranchId(input.branchId);

  const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product || !product.isActive) throw new Error('Product not found or inactive');

  return db.transaction(async (tx) => {
    const where = and(
      eq(stockBalances.locationType, 'BRANCH'),
      eq(stockBalances.locationId, branchId),
      eq(stockBalances.productId, input.productId),
      sql`(${stockBalances.onHand} - ${stockBalances.reserved}) >= ${qty}`,
      input.variantId
        ? eq(stockBalances.variantId, input.variantId)
        : sql`${stockBalances.variantId} IS NULL`,
    );

    const [balance] = await tx
      .update(stockBalances)
      .set({
        reserved: sql`${stockBalances.reserved} + ${qty}`,
        updatedAt: new Date(),
      })
      .where(where)
      .returning();

    if (!balance) throw new Error(`Insufficient available stock for ${product.name}`);

    await tx.insert(stockMovements).values({
      locationType: 'BRANCH',
      locationId: branchId,
      productId: input.productId,
      variantId: input.variantId || null,
      type: 'RESERVATION',
      delta: qty,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      actorId: input.actorId || null,
      notes: input.notes || `Reserved ${qty} for ${input.referenceId}`,
    });

    return {
      balance,
      available: Number(balance.onHand) - Number(balance.reserved),
      product: { id: product.id, name: product.name, sku: product.sku },
    };
  });
}

export async function releaseStock(input: StockReservationInput) {
  const qty = Math.max(1, Math.floor(Number(input.qty) || 1));
  const branchId = await resolveBranchId(input.branchId);

  return db.transaction(async (tx) => {
    const where = and(
      eq(stockBalances.locationType, 'BRANCH'),
      eq(stockBalances.locationId, branchId),
      eq(stockBalances.productId, input.productId),
      sql`${stockBalances.reserved} >= ${qty}`,
      input.variantId
        ? eq(stockBalances.variantId, input.variantId)
        : sql`${stockBalances.variantId} IS NULL`,
    );

    const [balance] = await tx
      .update(stockBalances)
      .set({
        reserved: sql`${stockBalances.reserved} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(where)
      .returning();

    if (!balance) throw new Error('Nothing reserved to release');

    await tx.insert(stockMovements).values({
      locationType: 'BRANCH',
      locationId: branchId,
      productId: input.productId,
      variantId: input.variantId || null,
      type: 'RELEASE',
      delta: -qty,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      actorId: input.actorId || null,
      notes: input.notes || `Released ${qty} for ${input.referenceId}`,
    });

    return {
      balance,
      available: Number(balance.onHand) - Number(balance.reserved),
    };
  });
}
