import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  chartOfAccounts,
  journalEntries,
  journalLines,
  orderItems,
  orders,
  payments,
  polimPothaAccounts,
  polimPothaEntries,
  products,
  stockBalances,
  stockMovements,
  auditLogs,
} from '@/db/schema';

export type CheckoutItem = {
  productId: string;
  variantId?: string | null;
  name?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
};

export type CheckoutInput = {
  orderNumber?: string;
  channel?: 'POS' | 'STOREFRONT' | 'WHATSAPP' | 'JARVIS' | 'MANUAL' | 'IMPORT' | 'API';
  branchId: string;
  registerId?: string;
  shiftId?: string;
  customerId?: string;
  items: CheckoutItem[];
  paymentMethod: 'CASH' | 'CARD' | 'CREDIT' | 'COD' | 'PAYHERE' | 'WEBXPAY' | 'STRIPE';
  amount?: number;
  clientUuid?: string;
  idempotencyKey?: string;
  actorId?: string;
  discountTotal?: number;
};

async function resolveAccountId(tx: typeof db, code: string) {
  const [row] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
  if (!row) throw new Error(`Chart of accounts missing code ${code}`);
  return row.id;
}

export async function durableCheckout(input: CheckoutInput) {
  if (!input.items?.length) throw new Error('Cart is empty');
  if (!input.branchId) throw new Error('branchId is required');

  return db.transaction(async (tx) => {
    // Idempotency: existing payment key or client uuid
    if (input.idempotencyKey) {
      const [existingPay] = await tx
        .select()
        .from(payments)
        .where(eq(payments.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (existingPay) {
        const [existingOrder] = await tx.select().from(orders).where(eq(orders.id, existingPay.orderId)).limit(1);
        return { reused: true as const, order: existingOrder, payment: existingPay };
      }
    }
    if (input.clientUuid) {
      const [existingOrder] = await tx.select().from(orders).where(eq(orders.clientUuid, input.clientUuid)).limit(1);
      if (existingOrder) {
        return { reused: true as const, order: existingOrder, payment: null };
      }
    }

    // Load product costs if needed
    const lines: Array<CheckoutItem & { unitCost: number; lineTotal: number }> = [];
    for (const item of input.items) {
      const [prod] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (!prod || !prod.isActive) throw new Error(`Product not found or inactive: ${item.productId}`);
      const unitCost = item.unitCost ?? Number(prod.costPrice);
      const unitPrice = item.unitPrice ?? Number(prod.salePrice);
      lines.push({
        ...item,
        name: item.name || prod.name,
        unitCost,
        unitPrice,
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const discountTotal = input.discountTotal ?? 0;
    const taxable = Math.max(0, subtotal - discountTotal);
    const taxTotal = Math.round(taxable * 0.18 * 100) / 100;
    const grandTotal = taxable + taxTotal;
    const totalCost = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0);
    const orderNumber = input.orderNumber || `POS-${Date.now().toString().slice(-8)}`;

    // Concurrent-safe stock decrement: available = on_hand - reserved
    for (const line of lines) {
      const result = await tx
        .update(stockBalances)
        .set({
          onHand: sql`${stockBalances.onHand} - ${line.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(stockBalances.locationType, 'BRANCH'),
            eq(stockBalances.locationId, input.branchId),
            eq(stockBalances.productId, line.productId),
            sql`(${stockBalances.onHand} - ${stockBalances.reserved}) >= ${line.quantity}`,
            line.variantId
              ? eq(stockBalances.variantId, line.variantId)
              : sql`${stockBalances.variantId} IS NULL`
          )
        )
        .returning({ id: stockBalances.id, onHand: stockBalances.onHand });

      if (!result.length) {
        throw new Error(`Insufficient stock for product ${line.productId}`);
      }

      await tx.insert(stockMovements).values({
        locationType: 'BRANCH',
        locationId: input.branchId,
        productId: line.productId,
        variantId: line.variantId || null,
        type: 'SALE',
        delta: -line.quantity,
        unitCost: String(line.unitCost.toFixed(2)),
        referenceType: 'ORDER',
        referenceId: orderNumber,
        actorId: input.actorId || null,
        notes: 'POS checkout',
      });
    }

    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        channel: input.channel || 'POS',
        fulfillmentLocationId: input.branchId,
        branchId: input.branchId,
        registerId: input.registerId || null,
        shiftId: input.shiftId || null,
        customerId: input.customerId || null,
        orderStatus: 'DELIVERED',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'DELIVERED',
        subtotal: String(subtotal.toFixed(2)),
        discountTotal: String(discountTotal.toFixed(2)),
        taxTotal: String(taxTotal.toFixed(2)),
        grandTotal: String(grandTotal.toFixed(2)),
        clientUuid: input.clientUuid || null,
        createdBy: input.actorId || null,
      })
      .returning();

    for (const line of lines) {
      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: line.productId,
        variantId: line.variantId || null,
        quantity: line.quantity,
        unitPrice: String(line.unitPrice.toFixed(2)),
        unitCost: String(line.unitCost.toFixed(2)),
        taxAmount: String(((line.lineTotal / Math.max(subtotal, 1)) * taxTotal).toFixed(2)),
        discountAmount: '0.00',
        lineTotal: String(line.lineTotal.toFixed(2)),
      });
    }

    const payMethod =
      input.paymentMethod === 'CREDIT'
        ? 'CREDIT'
        : input.paymentMethod === 'CARD'
          ? 'CARD'
          : input.paymentMethod === 'PAYHERE'
            ? 'PAYHERE'
            : 'CASH';

    const [payment] = await tx
      .insert(payments)
      .values({
        orderId: order.id,
        method: payMethod,
        amount: String((input.amount ?? grandTotal).toFixed(2)),
        currency: 'LKR',
        status: 'SUCCESS',
        idempotencyKey: input.idempotencyKey || null,
      })
      .returning();

    if (payMethod === 'CREDIT' && input.customerId) {
      const [acct] = await tx
        .select()
        .from(polimPothaAccounts)
        .where(eq(polimPothaAccounts.customerId, input.customerId))
        .limit(1);
      if (!acct) throw new Error('Polim Potha account missing for customer');
      const bal = Number(acct.currentBalance) + grandTotal;
      if (bal > Number(acct.creditLimit)) throw new Error('Credit limit exceeded');
      await tx
        .update(polimPothaAccounts)
        .set({ currentBalance: String(bal.toFixed(2)), updatedAt: new Date() })
        .where(eq(polimPothaAccounts.customerId, input.customerId));
      await tx.insert(polimPothaEntries).values({
        customerId: input.customerId,
        orderId: order.id,
        type: 'INVOICE',
        amount: String(grandTotal.toFixed(2)),
        balanceAfter: String(bal.toFixed(2)),
        notes: `POS credit sale ${orderNumber}`,
        createdBy: input.actorId || null,
      });
    }

    // Double-entry: Dr Cash/AR, Cr Revenue+VAT; Dr COGS, Cr Inventory
    const cashOrAr = payMethod === 'CREDIT' ? '1100' : payMethod === 'CARD' ? '1020' : '1010';
    const aCash = await resolveAccountId(tx as unknown as typeof db, cashOrAr);
    const aRev = await resolveAccountId(tx as unknown as typeof db, '4000');
    const aVat = await resolveAccountId(tx as unknown as typeof db, '2100');
    const aCogs = await resolveAccountId(tx as unknown as typeof db, '5000');
    const aInv = await resolveAccountId(tx as unknown as typeof db, '1200');

    const [je] = await tx
      .insert(journalEntries)
      .values({
        entryNumber: `JRN-${orderNumber}`,
        entryDate: new Date(),
        referenceType: 'ORDER',
        referenceId: order.id,
        description: `POS sale ${orderNumber}`,
        createdBy: input.actorId || null,
      })
      .returning();

    const netSales = taxable;
    await tx.insert(journalLines).values([
      { journalEntryId: je.id, accountId: aCash, debit: String(grandTotal.toFixed(2)), credit: '0.00', memo: 'Tender received' },
      { journalEntryId: je.id, accountId: aRev, debit: '0.00', credit: String(netSales.toFixed(2)), memo: 'Sales revenue' },
      { journalEntryId: je.id, accountId: aVat, debit: '0.00', credit: String(taxTotal.toFixed(2)), memo: 'VAT 18%' },
      { journalEntryId: je.id, accountId: aCogs, debit: String(totalCost.toFixed(2)), credit: '0.00', memo: 'COGS' },
      { journalEntryId: je.id, accountId: aInv, debit: '0.00', credit: String(totalCost.toFixed(2)), memo: 'Inventory relieved' },
    ]);

    if (input.actorId) {
      await tx.insert(auditLogs).values({
        actorId: input.actorId,
        action: 'POS_CHECKOUT',
        entity: 'orders',
        entityId: order.id,
        riskLevel: 'LOW_RISK_WRITE',
        afterState: { orderNumber, grandTotal, paymentMethod: payMethod },
      });
    }

    return { reused: false as const, order, payment, journalEntryId: je.id, lines, grandTotal, taxTotal, subtotal };
  });
}

export async function durablePolimRepay(params: {
  customerId: string;
  amount: number;
  paymentMethod?: 'CASH' | 'CARD';
  notes?: string;
  actorId?: string;
}) {
  if (params.amount <= 0) throw new Error('Amount must be positive');
  return db.transaction(async (tx) => {
    const [acct] = await tx
      .select()
      .from(polimPothaAccounts)
      .where(eq(polimPothaAccounts.customerId, params.customerId))
      .limit(1);
    if (!acct) throw new Error('Polim account not found');
    const next = Math.max(0, Number(acct.currentBalance) - params.amount);
    await tx
      .update(polimPothaAccounts)
      .set({ currentBalance: String(next.toFixed(2)), updatedAt: new Date() })
      .where(eq(polimPothaAccounts.customerId, params.customerId));
    const [entry] = await tx
      .insert(polimPothaEntries)
      .values({
        customerId: params.customerId,
        type: 'REPAYMENT',
        amount: String(params.amount.toFixed(2)),
        balanceAfter: String(next.toFixed(2)),
        notes: params.notes || 'Customer repayment',
        createdBy: params.actorId || null,
      })
      .returning();

    const cashCode = params.paymentMethod === 'CARD' ? '1020' : '1010';
    const aCash = await resolveAccountId(tx as unknown as typeof db, cashCode);
    const aAr = await resolveAccountId(tx as unknown as typeof db, '1100');
    const [je] = await tx
      .insert(journalEntries)
      .values({
        entryNumber: `JRN-REP-${Date.now().toString().slice(-8)}`,
        entryDate: new Date(),
        referenceType: 'POLIM_REPAYMENT',
        referenceId: entry.id,
        description: 'Polim Potha repayment',
        createdBy: params.actorId || null,
      })
      .returning();
    await tx.insert(journalLines).values([
      { journalEntryId: je.id, accountId: aCash, debit: String(params.amount.toFixed(2)), credit: '0.00', memo: 'Cash/bank in' },
      { journalEntryId: je.id, accountId: aAr, debit: '0.00', credit: String(params.amount.toFixed(2)), memo: 'AR reduced' },
    ]);
    return { accountBalance: next, entry, journalEntryId: je.id };
  });
}
