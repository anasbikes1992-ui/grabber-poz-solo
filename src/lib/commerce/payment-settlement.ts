/**
 * Settlement of online (gateway) storefront orders.
 *
 * Checkout creates these orders PENDING with stock held. Only a verified gateway webhook may call
 * settleGatewayPayment(); unpaid orders are cancelled and their stock restored by
 * expireUnpaidOnlineOrders() (run from the cron tick).
 */
import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import {
  db,
  chartOfAccounts,
  journalEntries,
  journalLines,
  loyaltyMembers,
  loyaltyTransactions,
  orderItems,
  orders,
  payments,
} from '@/db';
import { ensureDefaultChartOfAccounts } from '@/lib/commerce/ensure-coa';
import { recordReturn } from '@/lib/inventory/stock-service';

export const PAYMENT_HOLD_MINUTES = Number(process.env.PAYMENT_HOLD_MINUTES) > 0
  ? Number(process.env.PAYMENT_HOLD_MINUTES)
  : 30;

export type SettleResult =
  | { settled: true; alreadyPaid: boolean }
  | { settled: false; reason: 'order_not_found' | 'order_cancelled' };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function accountId(tx: Tx, code: string) {
  const [row] = await tx.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
  if (!row) throw new Error(`Chart of accounts missing code ${code}`);
  return row.id;
}

/** Mark a pending gateway order PAID, post the sale journal, accrue loyalty. Idempotent. */
export async function settleGatewayPayment(params: {
  orderNumber: string;
  providerRef?: string | null;
  amount?: string | null;
  currency?: string | null;
}): Promise<SettleResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, params.orderNumber))
      .for('update')
      .limit(1);
    if (!order) return { settled: false as const, reason: 'order_not_found' as const };
    if (order.paymentStatus === 'PAID') return { settled: true as const, alreadyPaid: true };
    // Expired/cancelled: stock was already released — needs a manual refund, never auto-fulfil.
    if (order.orderStatus === 'CANCELLED') return { settled: false as const, reason: 'order_cancelled' as const };

    await tx
      .update(orders)
      .set({
        paymentStatus: 'PAID',
        fulfillmentStatus: order.fulfillmentStatus === 'PENDING' ? 'ASSIGNED' : order.fulfillmentStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    const [pending] = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.status, 'PENDING')))
      .limit(1);
    if (pending) {
      await tx
        .update(payments)
        .set({ status: 'SUCCESS', providerRef: params.providerRef || null })
        .where(eq(payments.id, pending.id));
    } else {
      await tx
        .insert(payments)
        .values({
          orderId: order.id,
          method: 'CARD',
          amount: params.amount || String(order.grandTotal),
          currency: params.currency || 'LKR',
          providerRef: params.providerRef || null,
          status: 'SUCCESS',
          idempotencyKey: params.providerRef ? `settle_${params.providerRef}` : null,
        })
        .onConflictDoNothing();
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const grandTotal = Number(order.grandTotal);
    const taxTotal = Number(order.taxTotal);
    const totalCost = items.reduce((s, i) => s + Number(i.unitCost) * i.quantity, 0);

    await ensureDefaultChartOfAccounts(tx as unknown as typeof db);
    const [aCard, aRev, aVat, aCogs, aInv] = await Promise.all(
      ['1020', '4000', '2100', '5000', '1200'].map((code) => accountId(tx, code)),
    );
    const [je] = await tx
      .insert(journalEntries)
      .values({
        entryNumber: `JRN-${order.orderNumber}`,
        entryDate: new Date(),
        referenceType: 'ORDER',
        referenceId: order.id,
        description: `${order.channel} sale ${order.orderNumber}`,
      })
      .onConflictDoNothing()
      .returning();
    if (je) {
      await tx.insert(journalLines).values([
        { journalEntryId: je.id, accountId: aCard, debit: grandTotal.toFixed(2), credit: '0.00', memo: 'Gateway payment received' },
        { journalEntryId: je.id, accountId: aRev, debit: '0.00', credit: (grandTotal - taxTotal).toFixed(2), memo: 'Sales revenue' },
        { journalEntryId: je.id, accountId: aVat, debit: '0.00', credit: taxTotal.toFixed(2), memo: 'Output tax' },
        { journalEntryId: je.id, accountId: aCogs, debit: totalCost.toFixed(2), credit: '0.00', memo: 'COGS' },
        { journalEntryId: je.id, accountId: aInv, debit: '0.00', credit: totalCost.toFixed(2), memo: 'Inventory relieved' },
      ]);
    }

    const earned = Math.floor(grandTotal / 100);
    if (order.customerId && earned > 0) {
      const [member] = await tx
        .select()
        .from(loyaltyMembers)
        .where(and(eq(loyaltyMembers.customerId, order.customerId), eq(loyaltyMembers.active, true)))
        .limit(1);
      if (member) {
        const totalSpent = Number(member.totalSpent) + grandTotal;
        const tier = totalSpent >= 100000 ? 'PLATINUM' : totalSpent >= 25000 ? 'GOLD' : 'SILVER';
        const [updated] = await tx
          .update(loyaltyMembers)
          .set({
            points: sql`${loyaltyMembers.points} + ${earned}`,
            totalSpent: totalSpent.toFixed(2),
            tier,
            lastVisitAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(loyaltyMembers.id, member.id))
          .returning();
        if (updated) {
          await tx.insert(loyaltyTransactions).values({
            memberId: member.id,
            type: 'EARN',
            pointsDelta: earned,
            balanceAfter: updated.points,
            orderId: order.id,
            notes: `Earned from order ${order.orderNumber}`,
          });
        }
      }
    }

    return { settled: true as const, alreadyPaid: false };
  });
}

/**
 * Cancel online orders still unpaid after the hold window and put their stock back.
 * Only orders with a PENDING non-COD payment row are touched (COD orders are payable on delivery).
 */
export async function expireUnpaidOnlineOrders(now = new Date(), holdMinutes = PAYMENT_HOLD_MINUTES) {
  const cutoff = new Date(now.getTime() - holdMinutes * 60_000);
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(
      and(
        inArray(orders.channel, ['STOREFRONT', 'WHATSAPP']),
        eq(orders.orderStatus, 'CONFIRMED'),
        eq(orders.paymentStatus, 'PENDING'),
        eq(payments.status, 'PENDING'),
        eq(payments.method, 'CARD'),
        lt(orders.createdAt, cutoff),
      ),
    )
    .limit(100);

  let expired = 0;
  for (const { id } of stale) {
    const done = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for('update').limit(1);
      if (!order || order.orderStatus !== 'CONFIRMED' || order.paymentStatus !== 'PENDING') return false;

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      const locationId = order.branchId || order.fulfillmentLocationId;
      if (locationId) {
        for (const item of items) {
          await recordReturn(
            tx as never,
            { locationType: 'BRANCH', locationId },
            { productId: item.productId, variantId: item.variantId, quantity: item.quantity, unitCost: Number(item.unitCost) },
            {
              referenceType: 'ORDER',
              referenceId: order.orderNumber,
              actorId: null,
              notes: 'Unpaid online order expired — stock restored',
            },
          );
        }
      }

      // Give back any loyalty points redeemed at checkout.
      const redeems = await tx
        .select()
        .from(loyaltyTransactions)
        .where(and(eq(loyaltyTransactions.orderId, order.id), eq(loyaltyTransactions.type, 'REDEEM')));
      for (const r of redeems) {
        const refund = Math.abs(r.pointsDelta);
        const [m] = await tx
          .update(loyaltyMembers)
          .set({ points: sql`${loyaltyMembers.points} + ${refund}`, updatedAt: new Date() })
          .where(eq(loyaltyMembers.id, r.memberId))
          .returning();
        if (m) {
          await tx.insert(loyaltyTransactions).values({
            memberId: r.memberId,
            type: 'ADJUST',
            pointsDelta: refund,
            balanceAfter: m.points,
            orderId: order.id,
            notes: `Refund: order ${order.orderNumber} expired unpaid`,
          });
        }
      }

      await tx
        .update(orders)
        .set({ orderStatus: 'CANCELLED', paymentStatus: 'FAILED', fulfillmentStatus: 'FAILED', updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      await tx.update(payments).set({ status: 'FAILED' }).where(and(eq(payments.orderId, order.id), eq(payments.status, 'PENDING')));
      return true;
    });
    if (done) expired += 1;
  }
  return { expired, scanned: stale.length };
}
