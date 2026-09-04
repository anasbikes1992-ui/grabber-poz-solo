/**
 * Stock availability invariants shared by checkout, reserve API, and inventory reads.
 *
 * Production writes stay in stock-service.ts (atomic SQL).
 * These functions are the spec those writes must match.
 */

export type StockBalanceSnap = {
  onHand: number;
  reserved: number;
};

export type StockApplyMode = 'DECREMENT' | 'RESERVE';

export function availableStock(onHand: number, reserved: number): number {
  return Math.max(0, Number(onHand) - Number(reserved));
}

export function canFulfill(onHand: number, reserved: number, qty: number): boolean {
  const q = Math.floor(Number(qty) || 0);
  return q >= 1 && availableStock(onHand, reserved) >= q;
}

/** Checkout lifecycle flag → ledger operation. */
export function resolveStockApplyMode(decrementStock: boolean): StockApplyMode {
  return decrementStock ? 'DECREMENT' : 'RESERVE';
}

export function assertNonNegativeStock(snap: StockBalanceSnap): void {
  if (snap.onHand < 0) throw new Error('onHand must not be negative');
  if (snap.reserved < 0) throw new Error('reserved must not be negative');
  if (availableStock(snap.onHand, snap.reserved) < 0) throw new Error('available must not be negative');
}

export class InsufficientStockError extends Error {
  readonly available: number;
  readonly requested: number;

  constructor(available: number, requested: number, message = 'Insufficient available stock') {
    super(message);
    this.name = 'InsufficientStockError';
    this.available = available;
    this.requested = requested;
  }
}

/**
 * Immediate sale: decrement on_hand; release min(qty, reserved).
 * Matches stock-service recordSale WHERE (on_hand - reserved) >= qty.
 */
export function applyDecrementSale(snap: StockBalanceSnap, qty: number): StockBalanceSnap {
  const q = Math.floor(Number(qty) || 0);
  if (!canFulfill(snap.onHand, snap.reserved, q)) {
    throw new InsufficientStockError(availableStock(snap.onHand, snap.reserved), q);
  }
  const reservedRelease = Math.min(q, snap.reserved);
  const next: StockBalanceSnap = {
    onHand: snap.onHand - q,
    reserved: snap.reserved - reservedRelease,
  };
  assertNonNegativeStock(next);
  return next;
}

/**
 * Async hold: increment reserved only. on_hand unchanged.
 * Matches stock-service reserveStockTx.
 */
export function applyReserve(snap: StockBalanceSnap, qty: number): StockBalanceSnap {
  const q = Math.floor(Number(qty) || 0);
  if (!canFulfill(snap.onHand, snap.reserved, q)) {
    throw Object.assign(new Error('Insufficient available stock'), {
      name: 'InsufficientStockError',
      available: availableStock(snap.onHand, snap.reserved),
      requested: q,
    });
  }
  const next: StockBalanceSnap = {
    onHand: snap.onHand,
    reserved: snap.reserved + q,
  };
  assertNonNegativeStock(next);
  return next;
}

/** Postgres row-lock model: later checkouts see the post-update row. */
export function applySerializedStockOps(
  initial: StockBalanceSnap,
  ops: Array<(snap: StockBalanceSnap) => StockBalanceSnap>,
): { final: StockBalanceSnap; succeeded: number; failed: number } {
  let snap = { ...initial };
  let succeeded = 0;
  let failed = 0;
  for (const op of ops) {
    try {
      snap = op(snap);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  return { final: snap, succeeded, failed };
}
