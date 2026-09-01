import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import {
  db,
  orderItems,
  orderReturns,
  orders,
  journalEntries,
  journalLines,
  chartOfAccounts,
  stockBalances,
  stockMovements,
  auditLogs,
} from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const { orderId, returnNumber, reason, restockApproved = true, refundAmount } = body;
    if (!orderId) return NextResponse.json({ success: false, error: 'orderId required' }, { status: 400 });

    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;

    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) throw new Error('Order not found');
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

      const [ret] = await tx
        .insert(orderReturns)
        .values({
          originalOrderId: orderId,
          returnNumber: returnNumber || `RET-${Date.now().toString().slice(-6)}`,
          refundAmount: String(Number(refundAmount ?? order.grandTotal).toFixed(2)),
          restockApproved: Boolean(restockApproved),
          reason: reason || 'Customer return',
          approvedBy: actorId || null,
        })
        .returning();

      if (restockApproved && order.branchId) {
        for (const line of items) {
          await tx
            .update(stockBalances)
            .set({
              onHand: sql`${stockBalances.onHand} + ${line.quantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(stockBalances.locationType, 'BRANCH'),
                eq(stockBalances.locationId, order.branchId),
                eq(stockBalances.productId, line.productId),
                line.variantId
                  ? eq(stockBalances.variantId, line.variantId)
                  : sql`${stockBalances.variantId} IS NULL`,
              ),
            );
          await tx.insert(stockMovements).values({
            locationType: 'BRANCH',
            locationId: order.branchId,
            productId: line.productId,
            variantId: line.variantId,
            type: 'RETURN',
            delta: line.quantity,
            unitCost: line.unitCost,
            referenceType: 'ORDER_RETURN',
            referenceId: ret.id,
            actorId: actorId || null,
          });
        }
      }

      const refund = Number(refundAmount ?? order.grandTotal);
      if (refund < 0 || refund > Number(order.grandTotal)) {
        throw new Error(`Refund amount must be between 0 and order total (${order.grandTotal})`);
      }
      const totalCost = items.reduce((s, l) => s + Number(l.unitCost) * l.quantity, 0);
      const resolve = async (code: string) => {
        const [a] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
        if (!a) throw new Error(`Missing COA ${code}`);
        return a.id;
      };
      const aCash = await resolve('1010');
      const aRev = await resolve('4000');
      const aCogs = await resolve('5000');
      const aInv = await resolve('1200');
      const [je] = await tx
        .insert(journalEntries)
        .values({
          entryNumber: `JRN-${ret.returnNumber}`,
          entryDate: new Date(),
          referenceType: 'ORDER_RETURN',
          referenceId: ret.id,
          description: `Return ${ret.returnNumber}`,
          createdBy: actorId || null,
        })
        .returning();
      await tx.insert(journalLines).values([
        { journalEntryId: je.id, accountId: aRev, debit: String(refund.toFixed(2)), credit: '0.00', memo: 'Sales reversal' },
        { journalEntryId: je.id, accountId: aCash, debit: '0.00', credit: String(refund.toFixed(2)), memo: 'Cash refund' },
        { journalEntryId: je.id, accountId: aInv, debit: String(totalCost.toFixed(2)), credit: '0.00', memo: 'Inventory restored' },
        { journalEntryId: je.id, accountId: aCogs, debit: '0.00', credit: String(totalCost.toFixed(2)), memo: 'COGS relieved' },
      ]);

      await tx
        .update(orders)
        .set({ orderStatus: 'RETURNED', paymentStatus: 'REFUNDED', updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      if (actorId) {
        await tx.insert(auditLogs).values({
          actorId,
          action: 'ORDER_RETURN',
          entity: 'order_returns',
          entityId: ret.id,
          riskLevel: 'HIGH_RISK_WRITE',
          afterState: { returnNumber: ret.returnNumber, refund },
        });
      }

      return { return: ret, journalEntryId: je.id };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}
