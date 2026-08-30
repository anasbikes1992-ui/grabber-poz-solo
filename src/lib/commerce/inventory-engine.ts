/**
 * GRABBER BUSINESS OS — INVENTORY & STOCK RESERVATION ENGINE
 * Physical Goods Immutable Movement Ledger & Availability State Machine
 */

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
  | 'RELEASE';

export type LocationType = 'BRANCH' | 'WAREHOUSE';

export interface StockBalanceState {
  locationType: LocationType;
  locationId: string;
  productId: string;
  variantId?: string | null;
  onHand: number;
  reserved: number;
  damaged: number;
  available: number; // Derived: onHand - reserved
}

export interface StockMovementRecord {
  id: string;
  locationType: LocationType;
  locationId: string;
  productId: string;
  variantId?: string | null;
  type: StockMovementType;
  delta: number;
  unitCost?: number;
  referenceType?: string; // 'ORDER', 'PURCHASE_ORDER', 'TRANSFER', 'ADJUSTMENT'
  referenceId?: string;
  actorId?: string;
  notes?: string;
  createdAt: Date;
}

export interface ReserveStockItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export class InsufficientStockError extends Error {
  constructor(message: string, public productId: string, public available: number, public requested: number) {
    super(message);
    this.name = 'InsufficientStockError';
  }
}

export class InventoryEngine {
  private balances: Map<string, StockBalanceState> = new Map();
  private movements: StockMovementRecord[] = [];

  private buildKey(locationId: string, productId: string, variantId?: string | null): string {
    return `${locationId}:${productId}:${variantId || 'base'}`;
  }

  private getOrCreateRecord(locationType: LocationType, locationId: string, productId: string, variantId?: string | null): StockBalanceState {
    const key = this.buildKey(locationId, productId, variantId);
    let record = this.balances.get(key);
    if (!record) {
      record = {
        locationType,
        locationId,
        productId,
        variantId: variantId || null,
        onHand: 0,
        reserved: 0,
        damaged: 0,
        available: 0,
      };
      this.balances.set(key, record);
    }
    record.available = Math.max(0, record.onHand - record.reserved);
    return record;
  }

  public getBalance(locationType: LocationType, locationId: string, productId: string, variantId?: string | null): StockBalanceState {
    const record = this.getOrCreateRecord(locationType, locationId, productId, variantId);
    return { ...record };
  }

  public setBalance(state: StockBalanceState) {
    const key = this.buildKey(state.locationId, state.productId, state.variantId);
    state.available = Math.max(0, state.onHand - state.reserved);
    this.balances.set(key, { ...state });
  }

  /**
   * Reserves stock for an order across one or multiple items.
   * Throws InsufficientStockError if any item lacks available quantity.
   */
  public reserveStock(params: {
    locationType: LocationType;
    locationId: string;
    items: ReserveStockItemInput[];
    orderId: string;
    actorId?: string;
  }): StockBalanceState[] {
    const { locationType, locationId, items, orderId, actorId } = params;

    // 1. Validation pass: Ensure ALL items have sufficient stock
    for (const item of items) {
      const current = this.getOrCreateRecord(locationType, locationId, item.productId, item.variantId);
      if (current.available < item.quantity) {
        throw new InsufficientStockError(
          `Insufficient available stock for product ${item.productId}. Available: ${current.available}, Requested: ${item.quantity}`,
          item.productId,
          current.available,
          item.quantity
        );
      }
    }

    // 2. Mutation pass: Increment reserved counts
    const updatedStates: StockBalanceState[] = [];
    for (const item of items) {
      const current = this.getOrCreateRecord(locationType, locationId, item.productId, item.variantId);
      current.reserved += item.quantity;
      current.available = Math.max(0, current.onHand - current.reserved);

      this.movements.push({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        locationType,
        locationId,
        productId: item.productId,
        variantId: item.variantId,
        type: 'RESERVATION',
        delta: item.quantity,
        referenceType: 'ORDER',
        referenceId: orderId,
        actorId,
        notes: `Reserved ${item.quantity} units for Order ${orderId}`,
        createdAt: new Date(),
      });

      updatedStates.push({ ...current });
    }

    return updatedStates;
  }

  /**
   * Releases previously reserved stock (e.g. on order cancellation).
   */
  public releaseStockReservation(params: {
    locationType: LocationType;
    locationId: string;
    items: ReserveStockItemInput[];
    orderId: string;
    actorId?: string;
  }): StockBalanceState[] {
    const { locationType, locationId, items, orderId, actorId } = params;
    const updatedStates: StockBalanceState[] = [];

    for (const item of items) {
      const current = this.getOrCreateRecord(locationType, locationId, item.productId, item.variantId);
      current.reserved = Math.max(0, current.reserved - item.quantity);
      current.available = Math.max(0, current.onHand - current.reserved);

      this.movements.push({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        locationType,
        locationId,
        productId: item.productId,
        variantId: item.variantId,
        type: 'RELEASE',
        delta: -item.quantity,
        referenceType: 'ORDER',
        referenceId: orderId,
        actorId,
        notes: `Released ${item.quantity} reserved units for Order ${orderId}`,
        createdAt: new Date(),
      });

      updatedStates.push({ ...current });
    }

    return updatedStates;
  }

  /**
   * Commits an atomic stock movement (Physical Stock Ledger).
   * Automatically adjusts on-hand balances.
   */
  public commitMovement(params: {
    locationType: LocationType;
    locationId: string;
    productId: string;
    variantId?: string | null;
    type: StockMovementType;
    delta: number; // positive (increase) or negative (decrease)
    unitCost?: number;
    referenceType?: string;
    referenceId?: string;
    actorId?: string;
    notes?: string;
    isReservationFulfillment?: boolean; // If true, also decrement 'reserved' by |delta|
  }): { balance: StockBalanceState; movement: StockMovementRecord } {
    const {
      locationType,
      locationId,
      productId,
      variantId,
      type,
      delta,
      unitCost,
      referenceType,
      referenceId,
      actorId,
      notes,
      isReservationFulfillment,
    } = params;

    const current = this.getOrCreateRecord(locationType, locationId, productId, variantId);

    // Apply movement delta to onHand
    current.onHand = Math.max(0, current.onHand + delta);

    // If this movement fulfills a prior reservation (e.g. order dispatched/delivered), release the reserved counter
    if (isReservationFulfillment && delta < 0) {
      current.reserved = Math.max(0, current.reserved - Math.abs(delta));
    }

    current.available = Math.max(0, current.onHand - current.reserved);

    const movement: StockMovementRecord = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      locationType,
      locationId,
      productId,
      variantId,
      type,
      delta,
      unitCost,
      referenceType,
      referenceId,
      actorId,
      notes,
      createdAt: new Date(),
    };

    this.movements.push(movement);

    return {
      balance: { ...current },
      movement,
    };
  }

  public getMovements(filter?: { locationId?: string; productId?: string; referenceId?: string }): StockMovementRecord[] {
    return this.movements.filter((m) => {
      if (filter?.locationId && m.locationId !== filter.locationId) return false;
      if (filter?.productId && m.productId !== filter.productId) return false;
      if (filter?.referenceId && m.referenceId !== filter.referenceId) return false;
      return true;
    });
  }

  /**
   * Verifies the Stock Ledger Mathematical Invariant for a product at a location:
   * Opening + Purchases + Transfers In + Returns - Sales - Transfers Out - Damage +/- Adjustments = Current Stock
   */
  public verifyStockInvariant(locationId: string, productId: string, variantId?: string | null): {
    isValid: boolean;
    computedStock: number;
    currentOnHand: number;
    breakdown: Record<string, number>;
  } {
    const movements = this.getMovements({ locationId, productId });
    const breakdown: Record<string, number> = {
      PURCHASE_RECEIPT: 0,
      TRANSFER_IN: 0,
      TRANSFER_OUT: 0,
      SALE: 0,
      RETURN: 0,
      ADJUSTMENT: 0,
      COUNT: 0,
      DAMAGE: 0,
    };

    let computedStock = 0;

    for (const mov of movements) {
      if (variantId && mov.variantId !== variantId) continue;
      // Skip pure reservation/release records in physical stock count
      if (mov.type === 'RESERVATION' || mov.type === 'RELEASE') continue;

      computedStock += mov.delta;
      if (breakdown[mov.type] !== undefined) {
        breakdown[mov.type] += mov.delta;
      }
    }

    const currentBalance = this.getBalance('BRANCH', locationId, productId, variantId);
    const isValid = computedStock === currentBalance.onHand;

    return {
      isValid,
      computedStock,
      currentOnHand: currentBalance.onHand,
      breakdown,
    };
  }
}

export const defaultInventoryEngine = new InventoryEngine();
