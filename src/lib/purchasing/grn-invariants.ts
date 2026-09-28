export type GrnLine = {
  id: string;
  productId: string;
  variantId?: string | null;
  orderedQty: number | string;
  receivedQty: number | string;
  unitCost: number | string;
};

export function assertReceivablePurchaseOrder(status: string) {
  const normalized = status.toUpperCase();
  if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(normalized)) {
    throw Object.assign(new Error(`Purchase order status ${status} cannot receive GRN until approved`), { status: 400 });
  }
}

export function normalizeGrnQuantity(quantity: number) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
    throw Object.assign(new Error(`GRN quantity must be a positive integer, received: ${quantity}`), { status: 400 });
  }
  return qty;
}

export function assertCanReceiveLine(line: GrnLine | undefined, productId: string, quantity: number) {
  if (!line) {
    throw Object.assign(new Error(`Product ${productId} is not on this purchase order`), { status: 400 });
  }

  const remaining = Number(line.orderedQty) - Number(line.receivedQty || 0);
  if (quantity > remaining) {
    throw Object.assign(new Error(`Cannot receive ${quantity} of product ${productId}; remaining quantity is ${remaining}`), { status: 400 });
  }

  return line;
}

export function nextWeightedAverageCost(currentCost: number, onHandAfterReceipt: number, receivedQty: number, receivedUnitCost: number) {
  const onHandBeforeReceipt = Math.max(0, onHandAfterReceipt - receivedQty);
  if (onHandAfterReceipt <= 0) return receivedUnitCost;
  return (currentCost * onHandBeforeReceipt + receivedUnitCost * receivedQty) / onHandAfterReceipt;
}
