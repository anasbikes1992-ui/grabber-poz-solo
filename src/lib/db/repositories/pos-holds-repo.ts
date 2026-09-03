import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { orderItems, orders, products, productVariants } from '@/db/schema';
import { computeAuthoritativeCheckoutTotals } from '@/lib/commerce/authoritative-pricing';
import { loadAuthoritativeLines, loadTaxRegistry } from '@/lib/commerce/load-catalog-pricing';

export type HoldLine = {
  productId: string;
  variantId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

export type PosHoldInput = {
  branchId: string;
  shiftId?: string;
  actorId?: string;
  label?: string;
  items: HoldLine[];
  discountTotal?: number;
};

export async function createPosHold(input: PosHoldInput) {
  if (!input.items.length) throw new Error('Cannot hold an empty cart');

  return db.transaction(async (tx) => {
    const catalogLines = await loadAuthoritativeLines(tx as unknown as typeof db, input.items);
    const { rates, defaultTaxProfileId } = await loadTaxRegistry(tx as unknown as typeof db);
    const pricing = computeAuthoritativeCheckoutTotals(catalogLines, {
      discountTotal: input.discountTotal ?? 0,
      ratesRegistry: rates,
      defaultTaxProfileId,
    });
    const subtotal = pricing.subtotal;
    const discountTotal = pricing.totalDiscount;
    const taxTotal = pricing.taxTotal;
    const grandTotal = pricing.grandTotal;
    const orderNumber = input.label?.trim()
      ? `HOLD-${input.label.trim().replace(/\s+/g, '-').slice(0, 24)}-${Date.now().toString().slice(-6)}`
      : `HOLD-${Date.now().toString().slice(-8)}`;

    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        channel: 'POS',
        branchId: input.branchId,
        fulfillmentLocationId: input.branchId,
        shiftId: input.shiftId || null,
        orderStatus: 'DRAFT',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'PENDING',
        subtotal: String(subtotal.toFixed(2)),
        discountTotal: String(discountTotal.toFixed(2)),
        taxTotal: String(taxTotal.toFixed(2)),
        grandTotal: String(grandTotal.toFixed(2)),
        createdBy: input.actorId || null,
      })
      .returning();

    for (let i = 0; i < catalogLines.length; i++) {
      const line = catalogLines[i];
      const priced = pricing.lines[i];
      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: line.productId,
        variantId: line.variantId || null,
        quantity: line.quantity,
        unitPrice: String(line.unitPrice.toFixed(2)),
        unitCost: String(line.unitCost.toFixed(2)),
        taxAmount: String((priced?.taxAmount ?? 0).toFixed(2)),
        discountAmount: String(((priced?.lineDiscount ?? 0) + (priced?.allocatedCartDiscount ?? 0)).toFixed(2)),
        lineTotal: String((line.unitPrice * line.quantity).toFixed(2)),
      });
    }

    return { order, subtotal, discountTotal, grandTotal };
  });
}

export async function listPosHolds(branchId?: string) {
  const conditions = [eq(orders.orderStatus, 'DRAFT'), eq(orders.channel, 'POS')];
  if (branchId) conditions.push(eq(orders.branchId, branchId));

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      grandTotal: orders.grandTotal,
      discountTotal: orders.discountTotal,
      createdAt: orders.createdAt,
      branchId: orders.branchId,
    })
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  const result = [];
  for (const row of rows) {
    const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, row.id));
    result.push({ ...row, itemCount: lines.length, lines });
  }
  return result;
}

export async function getPosHold(orderId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.orderStatus, 'DRAFT')))
    .limit(1);
  if (!order) return null;

  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const variantIds = lines.map((l) => l.variantId).filter(Boolean) as string[];

  const productRows =
    productIds.length > 0
      ? await db.select().from(products).where(inArray(products.id, productIds))
      : [];
  const variantRows =
    variantIds.length > 0
      ? await db.select().from(productVariants).where(inArray(productVariants.id, variantIds))
      : [];
  const productMap = new Map(productRows.map((p) => [p.id, p]));
  const variantMap = new Map(variantRows.map((v) => [v.id, v]));

  const enriched = lines.map((line) => {
    const prod = productMap.get(line.productId);
    const variant = line.variantId ? variantMap.get(line.variantId) : undefined;
    return {
      ...line,
      name: prod?.name || 'Product',
      variantLabel: variant?.name || prod?.sku || 'Standard',
    };
  });

  return { order, lines: enriched };
}

export async function deletePosHold(orderId: string) {
  const [deleted] = await db
    .delete(orders)
    .where(and(eq(orders.id, orderId), eq(orders.orderStatus, 'DRAFT')))
    .returning({ id: orders.id });
  return !!deleted;
}
