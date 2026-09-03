/**
 * Centralized stock ledger — sole write path for stock_balances + stock_movements.
 */
import { and, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { db, stockBalances, stockMovements } from '@/db';
import * as schema from '@/db/schema';
import { availableStock } from '@/lib/inventory/stock-invariants';

export type DbTx = PostgresJsDatabase<typeof schema>;
export type LocationType = 'BRANCH' | 'WAREHOUSE';

export type StockMovementType =
  | 'PURCHASE_RECEIPT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'SALE'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'COUNT'
  | 'DAMAGE'
  | 'RESERVATION'
  | 'RELEASE'
  | 'REPAIR_PARTS_ISSUE';

export type StockLineInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitCost?: number;
};

export type MovementMeta = {
  referenceType: string;
  referenceId: string;
  actorId?: string | null;
  notes?: string;
};

export class InsufficientStockError extends Error {
  constructor(
    message: string,
    public productId: string,
    public available = 0,
    public requested = 0,
  ) {
    super(message);
    this.name = 'InsufficientStockError';
  }
}

const PHYSICAL_TYPES = new Set([
  'PURCHASE_RECEIPT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'SALE',
  'RETURN',
  'ADJUSTMENT',
  'COUNT',
  'DAMAGE',
  'REPAIR_PARTS_ISSUE',
]);

function variantWhere(variantId?: string | null) {
  return variantId ? eq(stockBalances.variantId, variantId) : sql`${stockBalances.variantId} IS NULL`;
}

async function upsertBalance(
  tx: DbTx,
  loc: { locationType: LocationType; locationId: string },
  line: StockLineInput,
  deltaOnHand: number,
  deltaReserved = 0,
  deltaDamaged = 0,
) {
  const where = and(
    eq(stockBalances.locationType, loc.locationType),
    eq(stockBalances.locationId, loc.locationId),
    eq(stockBalances.productId, line.productId),
    variantWhere(line.variantId),
  );

  const [existing] = await tx.select().from(stockBalances).where(where).limit(1);

  if (existing) {
    const [updated] = await tx
      .update(stockBalances)
      .set({
        onHand: sql`${stockBalances.onHand} + ${deltaOnHand}`,
        reserved: sql`${stockBalances.reserved} + ${deltaReserved}`,
        damaged: sql`${stockBalances.damaged} + ${deltaDamaged}`,
        updatedAt: new Date(),
      })
      .where(where)
      .returning();
    return updated!;
  }

  if (deltaOnHand < 0 || deltaReserved < 0) {
    throw new InsufficientStockError(`No stock balance for product ${line.productId}`, line.productId, 0, line.quantity);
  }

  const [inserted] = await tx
    .insert(stockBalances)
    .values({
      locationType: loc.locationType,
      locationId: loc.locationId,
      productId: line.productId,
      variantId: line.variantId || null,
      onHand: Math.max(0, deltaOnHand),
      reserved: Math.max(0, deltaReserved),
      damaged: Math.max(0, deltaDamaged),
    })
    .returning();
  return inserted!;
}

async function insertMovement(
  tx: DbTx,
  loc: { locationType: LocationType; locationId: string },
  type: StockMovementType,
  delta: number,
  line: StockLineInput,
  meta: MovementMeta,
) {
  await tx.insert(stockMovements).values({
    locationType: loc.locationType,
    locationId: loc.locationId,
    productId: line.productId,
    variantId: line.variantId || null,
    type,
    delta,
    unitCost: line.unitCost != null ? String(line.unitCost.toFixed(2)) : null,
    referenceType: meta.referenceType,
    referenceId: meta.referenceId,
    actorId: meta.actorId || null,
    notes: meta.notes || null,
  });
}

export async function recordSale(
  tx: DbTx,
  loc: { locationType: LocationType; locationId: string },
  line: StockLineInput,
  meta: MovementMeta,
  options?: { allowUnderrun?: boolean },
) {
  const qty = Math.max(1, Math.floor(line.quantity));
  const baseWhere = and(
    eq(stockBalances.locationType, loc.locationType),
    eq(stockBalances.locationId, loc.locationId),
    eq(stockBalances.productId, line.productId),
    variantWhere(line.variantId),
  );

  if (options?.allowUnderrun) {
    const [existing] = await tx.select().from(stockBalances).where(baseWhere).limit(1);
    let balance = existing;
    if (!balance) {
      balance = await upsertBalance(tx, loc, line, 0);
    }
    const [updated] = await tx
      .update(stockBalances)
      .set({
        onHand: sql`${stockBalances.onHand} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(eq(stockBalances.id, balance.id))
      .returning();
    if (!updated) {
      throw new InsufficientStockError(`Insufficient stock for ${line.productId}`, line.productId, 0, qty);
    }
    const reservedRelease = Math.min(qty, Number(updated.reserved));
    if (reservedRelease > 0) {
      await tx
        .update(stockBalances)
        .set({
          reserved: sql`${stockBalances.reserved} - ${reservedRelease}`,
          updatedAt: new Date(),
        })
        .where(eq(stockBalances.id, updated.id));
      await insertMovement(
        tx,
        loc,
        'RELEASE',
        -reservedRelease,
        { ...line, quantity: reservedRelease },
        { ...meta, notes: meta.notes ? `${meta.notes}; reservation fulfilled` : 'Reservation fulfilled on sale' },
      );
    }
    await insertMovement(tx, loc, 'SALE', -qty, { ...line, quantity: qty }, {
      ...meta,
      notes: meta.notes ? `${meta.notes}; offline underrun honored` : 'Offline sync — stock underrun honored',
    });
    return { balance: updated, onHand: Number(updated.onHand), reservedReleased: reservedRelease };
  }

  const where = and(baseWhere, sql`(${stockBalances.onHand} - ${stockBalances.reserved}) >= ${qty}`);

  const [balance] = await tx
    .update(stockBalances)
    .set({
      onHand: sql`${stockBalances.onHand} - ${qty}`,
      updatedAt: new Date(),
    })
    .where(where)
    .returning();

  if (!balance) {
    const [current] = await tx.select().from(stockBalances).where(baseWhere).limit(1);
    const available = current ? availableStock(Number(current.onHand), Number(current.reserved)) : 0;
    throw new InsufficientStockError(`Insufficient stock for ${line.productId}`, line.productId, available, qty);
  }

  const reservedRelease = Math.min(qty, Number(balance.reserved));
  if (reservedRelease > 0) {
    await tx
      .update(stockBalances)
      .set({
        reserved: sql`${stockBalances.reserved} - ${reservedRelease}`,
        updatedAt: new Date(),
      })
      .where(eq(stockBalances.id, balance.id));
    await insertMovement(
      tx,
      loc,
      'RELEASE',
      -reservedRelease,
      { ...line, quantity: reservedRelease },
      { ...meta, notes: meta.notes ? `${meta.notes}; reservation fulfilled` : 'Reservation fulfilled on sale' },
    );
  }

  await insertMovement(tx, loc, 'SALE', -qty, { ...line, quantity: qty }, meta);
  return { balance, onHand: Number(balance.onHand), reservedReleased: reservedRelease };
}

export async function recordPurchaseReceipt(
  tx: DbTx,
  loc: { locationType: LocationType; locationId: string },
  line: StockLineInput,
  meta: MovementMeta,
) {
  const qty = Math.max(1, Math.floor(line.quantity));
  const balance = await upsertBalance(tx, loc, line, qty);
  await insertMovement(tx, loc, 'PURCHASE_RECEIPT', qty, { ...line, quantity: qty }, meta);
  return balance;
}

export async function recordReturn(
  tx: DbTx,
  loc: { locationType: LocationType; locationId: string },
  line: StockLineInput,
  meta: MovementMeta,
) {
  const qty = Math.max(1, Math.floor(line.quantity));
  await upsertBalance(tx, loc, line, qty);
  await insertMovement(tx, loc, 'RETURN', qty, { ...line, quantity: qty }, meta);
}

export async function recordDamage(
  tx: DbTx,
  loc: { locationType: LocationType; locationId: string },
  line: StockLineInput,
  meta: MovementMeta,
) {
  const qty = Math.max(1, Math.floor(line.quantity));
  const where = and(
    eq(stockBalances.locationType, loc.locationType),
    eq(stockBalances.locationId, loc.locationId),
    eq(stockBalances.productId, line.productId),
    sql`${stockBalances.onHand} >= ${qty}`,
    variantWhere(line.variantId),
  );

  const [balance] = await tx
    .update(stockBalances)
    .set({
      onHand: sql`${stockBalances.onHand} - ${qty}`,
      damaged: sql`${stockBalances.damaged} + ${qty}`,
      updatedAt: new Date(),
    })
    .where(where)
    .returning();

  if (!balance) throw new InsufficientStockError(`Insufficient on-hand for damage write-off`, line.productId, 0, qty);

  await insertMovement(tx, loc, 'DAMAGE', -qty, { ...line, quantity: qty }, meta);
  return balance;
}

export async function recordRepairParts(
  tx: DbTx,
  loc: { locationType: LocationType; locationId: string },
  line: StockLineInput,
  meta: MovementMeta,
) {
  const qty = Math.max(1, Math.floor(line.quantity));
  const where = and(
    eq(stockBalances.locationType, loc.locationType),
    eq(stockBalances.locationId, loc.locationId),
    eq(stockBalances.productId, line.productId),
    sql`(${stockBalances.onHand} - ${stockBalances.reserved}) >= ${qty}`,
    variantWhere(line.variantId),
  );

  const [balance] = await tx
    .update(stockBalances)
    .set({
      onHand: sql`${stockBalances.onHand} - ${qty}`,
      updatedAt: new Date(),
    })
    .where(where)
    .returning();

  if (!balance) throw new InsufficientStockError(`Insufficient stock for repair parts`, line.productId, 0, qty);

  await insertMovement(tx, loc, 'REPAIR_PARTS_ISSUE', -qty, { ...line, quantity: qty }, meta);
  return { balance, onHand: Number(balance.onHand) };
}

export async function recordAdjustment(
  tx: DbTx,
  loc: { locationType: LocationType; locationId: string },
  line: StockLineInput,
  meta: MovementMeta,
) {
  const qty = Math.floor(line.quantity);
  if (qty === 0) return;
  if (qty > 0) {
    await upsertBalance(tx, loc, line, qty);
  } else {
    const abs = Math.abs(qty);
    const where = and(
      eq(stockBalances.locationType, loc.locationType),
      eq(stockBalances.locationId, loc.locationId),
      eq(stockBalances.productId, line.productId),
      sql`${stockBalances.onHand} >= ${abs}`,
      variantWhere(line.variantId),
    );
    const [balance] = await tx
      .update(stockBalances)
      .set({ onHand: sql`${stockBalances.onHand} - ${abs}`, updatedAt: new Date() })
      .where(where)
      .returning();
    if (!balance) throw new InsufficientStockError('Insufficient stock for adjustment', line.productId, 0, abs);
  }
  await insertMovement(tx, loc, 'ADJUSTMENT', qty, { ...line, quantity: qty }, meta);
}

export async function recordTransfer(
  tx: DbTx,
  from: { locationType: LocationType; locationId: string },
  to: { locationType: LocationType; locationId: string },
  line: StockLineInput,
  meta: MovementMeta,
  options?: { skipDestinationCredit?: boolean; skipSourceDebit?: boolean },
) {
  const qty = Math.max(1, Math.floor(line.quantity));

  if (!options?.skipSourceDebit) {
    const where = and(
      eq(stockBalances.locationType, from.locationType),
      eq(stockBalances.locationId, from.locationId),
      eq(stockBalances.productId, line.productId),
      sql`(${stockBalances.onHand} - ${stockBalances.reserved}) >= ${qty}`,
      variantWhere(line.variantId),
    );

    const [src] = await tx
      .update(stockBalances)
      .set({ onHand: sql`${stockBalances.onHand} - ${qty}`, updatedAt: new Date() })
      .where(where)
      .returning();

    if (!src) throw new InsufficientStockError(`Insufficient stock at source`, line.productId, 0, qty);
    await insertMovement(tx, from, 'TRANSFER_OUT', -qty, { ...line, quantity: qty }, meta);
  }

  if (!options?.skipDestinationCredit) {
    await upsertBalance(tx, to, line, qty);
    await insertMovement(tx, to, 'TRANSFER_IN', qty, { ...line, quantity: qty }, meta);
  }
}

export async function reserveStockTx(
  tx: DbTx,
  loc: { locationType: LocationType; locationId: string },
  line: StockLineInput,
  meta: MovementMeta,
) {
  const qty = Math.max(1, Math.floor(line.quantity));
  const where = and(
    eq(stockBalances.locationType, loc.locationType),
    eq(stockBalances.locationId, loc.locationId),
    eq(stockBalances.productId, line.productId),
    sql`(${stockBalances.onHand} - ${stockBalances.reserved}) >= ${qty}`,
    variantWhere(line.variantId),
  );

  const [balance] = await tx
    .update(stockBalances)
    .set({ reserved: sql`${stockBalances.reserved} + ${qty}`, updatedAt: new Date() })
    .where(where)
    .returning();

  if (!balance) {
    const [current] = await tx
      .select()
      .from(stockBalances)
      .where(
        and(
          eq(stockBalances.locationType, loc.locationType),
          eq(stockBalances.locationId, loc.locationId),
          eq(stockBalances.productId, line.productId),
          variantWhere(line.variantId),
        ),
      )
      .limit(1);
    const available = current ? availableStock(Number(current.onHand), Number(current.reserved)) : 0;
    throw new InsufficientStockError(`Insufficient available stock`, line.productId, available, qty);
  }

  await insertMovement(tx, loc, 'RESERVATION', qty, { ...line, quantity: qty }, meta);
  return balance;
}

export async function releaseStockTx(
  tx: DbTx,
  loc: { locationType: LocationType; locationId: string },
  line: StockLineInput,
  meta: MovementMeta,
) {
  const qty = Math.max(1, Math.floor(line.quantity));
  const where = and(
    eq(stockBalances.locationType, loc.locationType),
    eq(stockBalances.locationId, loc.locationId),
    eq(stockBalances.productId, line.productId),
    sql`${stockBalances.reserved} >= ${qty}`,
    variantWhere(line.variantId),
  );

  const [balance] = await tx
    .update(stockBalances)
    .set({ reserved: sql`${stockBalances.reserved} - ${qty}`, updatedAt: new Date() })
    .where(where)
    .returning();

  if (!balance) throw new Error('Nothing reserved to release');

  await insertMovement(tx, loc, 'RELEASE', -qty, { ...line, quantity: qty }, meta);
  return balance;
}

/** Verify on_hand matches sum of physical movement deltas (excludes RESERVATION/RELEASE). */
export async function reconcileStockDrift(
  tx: DbTx = db as DbTx,
  locationId?: string,
): Promise<Array<{ productId: string; variantId: string | null; onHand: number; ledgerSum: number; drift: number }>> {
  const balances = await tx.select().from(stockBalances);
  const filtered = locationId ? balances.filter((b) => b.locationId === locationId) : balances;
  const drifts: Array<{ productId: string; variantId: string | null; onHand: number; ledgerSum: number; drift: number }> = [];

  for (const bal of filtered) {
    const movements = await tx
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.locationId, bal.locationId),
          eq(stockMovements.productId, bal.productId),
          bal.variantId ? eq(stockMovements.variantId, bal.variantId) : sql`${stockMovements.variantId} IS NULL`,
        ),
      );

    const ledgerSum = movements
      .filter((m) => PHYSICAL_TYPES.has(m.type))
      .reduce((s, m) => s + m.delta, 0);

    const onHand = Number(bal.onHand);
    const drift = onHand - ledgerSum;
    if (drift !== 0) {
      drifts.push({ productId: bal.productId, variantId: bal.variantId, onHand, ledgerSum, drift });
    }
  }
  return drifts;
}

export const StockService = {
  recordSale,
  recordPurchaseReceipt,
  recordReturn,
  recordDamage,
  recordRepairParts,
  recordAdjustment,
  recordTransfer,
  reserveStockTx,
  releaseStockTx,
  reconcileStockDrift,
};
