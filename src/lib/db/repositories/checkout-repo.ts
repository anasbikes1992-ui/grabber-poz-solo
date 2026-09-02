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
  auditLogs,
} from '@/db/schema';
import { resolveCheckoutStatuses, type CheckoutPaymentMethod } from '@/lib/commerce/order-lifecycle';
import { ensureDefaultChartOfAccounts } from '@/lib/commerce/ensure-coa';
import { dispatchAutomationEvent } from '@/lib/automation/engine';
import { dispatchStockLowIfNeeded } from '@/lib/inventory/stock-low-alert';
import { sendMetaPurchaseEvent } from '@/lib/integrations/meta-capi';
import { recordSale } from '@/lib/inventory/stock-service';
import { consumeFefoLot } from '@/lib/inventory/fefo';
import { customers } from '@/db/schema';

export type CheckoutItem = {
  productId: string;
  variantId?: string | null;
  name?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
};

export type CheckoutPaymentLine = {
  method: CheckoutPaymentMethod;
  amount: number;
};

export type CheckoutInput = {
  orderNumber?: string;
  channel?: 'POS' | 'STOREFRONT' | 'WHATSAPP' | 'JARVIS' | 'MANUAL' | 'IMPORT' | 'API';
  branchId: string;
  registerId?: string;
  shiftId?: string;
  customerId?: string;
  items: CheckoutItem[];
  paymentMethod: CheckoutPaymentMethod;
  /** Split or multi-tender checkout — when set, overrides single paymentMethod */
  payments?: CheckoutPaymentLine[];
  amount?: number;
  clientUuid?: string;
  idempotencyKey?: string;
  actorId?: string;
  discountTotal?: number;
  promoRuleId?: string;
  terminalId?: string;
  clientSequence?: number;
  /** Offline POS sync — honor sale even when stock would go negative */
  allowStockUnderrun?: boolean;
};

function normalizePayMethod(method: CheckoutPaymentMethod) {
  if (method === 'CREDIT') return 'CREDIT' as const;
  if (method === 'CARD' || method === 'PAYHERE' || method === 'WEBXPAY' || method === 'STRIPE') return 'CARD' as const;
  if (method === 'COD') return 'COD' as const;
  return 'CASH' as const;
}

function accountCodeForMethod(method: ReturnType<typeof normalizePayMethod>) {
  if (method === 'CREDIT') return '1100';
  if (method === 'CARD') return '1020';
  return '1010';
}

async function resolveAccountId(tx: typeof db, code: string) {
  const [row] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
  if (!row) throw new Error(`Chart of accounts missing code ${code}`);
  return row.id;
}

export async function durableCheckout(input: CheckoutInput) {
  if (!input.items?.length) throw new Error('Cart is empty');
  if (!input.branchId) throw new Error('branchId is required');

  const result = await db.transaction(async (tx) => {
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
    const lines: Array<
      CheckoutItem & { unitCost: number; lineTotal: number; sku: string; reorderLevel: number }
    > = [];
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
        sku: prod.sku,
        reorderLevel: prod.reorderLevel ?? 10,
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const discountTotal = input.discountTotal ?? 0;
    const taxable = Math.max(0, subtotal - discountTotal);
    const taxTotal = Math.round(taxable * 0.18 * 100) / 100;
    const grandTotal = taxable + taxTotal;
    const totalCost = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0);
    const orderNumber = input.orderNumber || `POS-${Date.now().toString().slice(-8)}`;

    const paymentLines: CheckoutPaymentLine[] =
      input.payments?.length && input.payments.length > 0
        ? input.payments
        : [{ method: input.paymentMethod, amount: input.amount ?? grandTotal }];

    const isSplit = paymentLines.length > 1;
    const lifecycleMethod = isSplit ? 'CASH' : input.paymentMethod;
    const statuses = resolveCheckoutStatuses(input.channel, lifecycleMethod, isSplit);
    const paymentSuccess = statuses.paymentStatus === 'PAID';

    const stockLowCandidates: Array<{
      productId: string;
      productName: string;
      sku: string;
      onHand: number;
      reorderLevel: number;
    }> = [];

    // Stock decrement via centralized StockService
    for (const line of lines) {
      const { onHand } = await recordSale(
        tx,
        { locationType: 'BRANCH', locationId: input.branchId },
        {
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          unitCost: line.unitCost,
        },
        {
          referenceType: 'ORDER',
          referenceId: orderNumber,
          actorId: input.actorId || null,
          notes: input.channel === 'STOREFRONT' ? 'Storefront checkout' : 'POS checkout',
        },
        { allowUnderrun: Boolean(input.allowStockUnderrun) },
      );

      await consumeFefoLot(
        tx,
        { locationType: 'BRANCH', locationId: input.branchId },
        line.productId,
        line.variantId,
        line.quantity,
      ).catch(() => null);

      if (onHand <= line.reorderLevel) {
        stockLowCandidates.push({
          productId: line.productId,
          productName: line.name || line.productId,
          sku: line.sku,
          onHand,
          reorderLevel: line.reorderLevel,
        });
      }
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
        orderStatus: statuses.orderStatus,
        paymentStatus: statuses.paymentStatus,
        fulfillmentStatus: statuses.fulfillmentStatus,
        subtotal: String(subtotal.toFixed(2)),
        discountTotal: String(discountTotal.toFixed(2)),
        taxTotal: String(taxTotal.toFixed(2)),
        grandTotal: String(grandTotal.toFixed(2)),
        clientUuid: input.clientUuid || null,
        terminalId: input.terminalId || null,
        clientSequence: input.clientSequence ?? null,
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

    const insertedPayments = [];
    for (let i = 0; i < paymentLines.length; i++) {
      const line = paymentLines[i];
      const payMethod = normalizePayMethod(line.method);
      const [payment] = await tx
        .insert(payments)
        .values({
          orderId: order.id,
          method: payMethod,
          amount: String(line.amount.toFixed(2)),
          currency: 'LKR',
          status: paymentSuccess ? 'SUCCESS' : 'PENDING',
          idempotencyKey: i === 0 ? input.idempotencyKey || null : null,
        })
        .returning();
      insertedPayments.push(payment);
    }
    const primaryPayMethod = normalizePayMethod(paymentLines[0].method);
    const payment = insertedPayments[0];

    if (primaryPayMethod === 'CREDIT' && input.customerId && paymentSuccess) {
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

    let journalEntryId: string | null = null;

    if (paymentSuccess) {
      await ensureDefaultChartOfAccounts(tx as unknown as typeof db);
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
          description: `${input.channel || 'POS'} sale ${orderNumber}`,
          createdBy: input.actorId || null,
        })
        .returning();

      journalEntryId = je.id;
      const netSales = taxable;
      const debitLines: Array<{ journalEntryId: string; accountId: string; debit: string; credit: string; memo: string }> = [];

      if (isSplit) {
        for (const line of paymentLines) {
          const code = accountCodeForMethod(normalizePayMethod(line.method));
          const accountId = await resolveAccountId(tx as unknown as typeof db, code);
          debitLines.push({
            journalEntryId: je.id,
            accountId,
            debit: String(line.amount.toFixed(2)),
            credit: '0.00',
            memo: `${line.method} tender`,
          });
        }
      } else {
        const code = accountCodeForMethod(primaryPayMethod);
        const aCash = await resolveAccountId(tx as unknown as typeof db, code);
        debitLines.push({
          journalEntryId: je.id,
          accountId: aCash,
          debit: String(grandTotal.toFixed(2)),
          credit: '0.00',
          memo: 'Tender received',
        });
      }

      await tx.insert(journalLines).values([
        ...debitLines,
        { journalEntryId: je.id, accountId: aRev, debit: '0.00', credit: String(netSales.toFixed(2)), memo: 'Sales revenue' },
        { journalEntryId: je.id, accountId: aVat, debit: '0.00', credit: String(taxTotal.toFixed(2)), memo: 'VAT 18%' },
        { journalEntryId: je.id, accountId: aCogs, debit: String(totalCost.toFixed(2)), credit: '0.00', memo: 'COGS' },
        { journalEntryId: je.id, accountId: aInv, debit: '0.00', credit: String(totalCost.toFixed(2)), memo: 'Inventory relieved' },
      ]);
    }

    if (input.actorId) {
      await tx.insert(auditLogs).values({
        actorId: input.actorId,
        action: 'POS_CHECKOUT',
        entity: 'orders',
        entityId: order.id,
        riskLevel: 'LOW_RISK_WRITE',
        afterState: {
          orderNumber,
          grandTotal,
          paymentMethod: isSplit ? 'SPLIT' : primaryPayMethod,
          orderStatus: statuses.orderStatus,
        },
      });
    }

    return {
      reused: false as const,
      order,
      payment,
      payments: insertedPayments,
      journalEntryId,
      lines,
      grandTotal,
      taxTotal,
      subtotal,
      isSplit,
      stockLowCandidates,
    };
  });

  if (result.reused === false && result.order) {
    for (const alert of result.stockLowCandidates || []) {
      void dispatchStockLowIfNeeded(alert).catch(() => undefined);
    }
    let customerName = 'Customer';
    let customerPhone = '';
    let customerEmail: string | null = null;
    if (input.customerId) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
      customerName = cust?.name || customerName;
      customerPhone = (cust?.phone || '').replace(/\D/g, '');
      customerEmail = cust?.email || null;
    }
    void dispatchAutomationEvent('ORDER_CREATED', {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      channel: input.channel || 'POS',
      grandTotal: result.grandTotal,
      customerName,
      customerPhone,
    }).catch(() => undefined);

    if (input.channel === 'STOREFRONT' || input.channel === 'POS') {
      void sendMetaPurchaseEvent({
        orderNumber: result.order.orderNumber,
        value: Number(result.grandTotal || 0),
        email: customerEmail,
        phone: customerPhone || undefined,
      }).catch(() => undefined);
    }
  }

  return result;
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
