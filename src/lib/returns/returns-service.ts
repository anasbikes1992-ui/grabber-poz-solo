import { eq, inArray, sql } from 'drizzle-orm';
import {
  db,
  orders,
  orderItems,
  orderReturns,
  orderReturnLines,
  journalEntries,
  journalLines,
  chartOfAccounts,
  auditLogs,
  polimPothaAccounts,
  polimPothaEntries,
} from '@/db';
import { ensureDefaultChartOfAccounts } from '@/lib/commerce/ensure-coa';
import { recordReturn, recordDamage } from '@/lib/inventory/stock-service';

export type ReturnLineInput = {
  orderItemId: string;
  quantity: number;
  unitRefund?: number;
  gradingStatus?: 'RESTOCKED' | 'GRADED_A' | 'GRADED_B' | 'DAMAGED' | 'EXPIRED' | 'SCRAP';
  reason?: string;
  serialNumber?: string;
};

export type ProcessReturnInput = {
  orderId: string;
  returnNumber?: string;
  reason?: string;
  refundDestination?: 'ORIGINAL' | 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CUSTOMER_CREDIT' | 'STORE_CREDIT';
  restockApproved?: boolean;
  gradingStatus?: string;
  lines?: ReturnLineInput[];
  refundAmount?: number;
  actorId?: string | null;
};

export async function processOrderReturn(input: ProcessReturnInput) {
  const {
    orderId,
    returnNumber: customReturnNo,
    reason = 'Customer return',
    refundDestination = 'CASH',
    restockApproved = true,
    gradingStatus: defaultGrading = 'RESTOCKED',
    lines: inputLines,
    refundAmount: customRefundAmount,
    actorId,
  } = input;

  return await db.transaction(async (tx) => {
    // 1. Fetch Order & Items
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      throw Object.assign(new Error('Order not found'), { status: 404 });
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    if (items.length === 0) {
      throw Object.assign(new Error('Order has no items'), { status: 400 });
    }

    const itemMap = new Map(items.map((i) => [i.id, i]));

    // 2. Fetch all existing returns for this order to compute unreturned quantities
    const existingReturns = await tx.select().from(orderReturns).where(eq(orderReturns.originalOrderId, orderId));
    const existingReturnIds = existingReturns.map((r) => r.id);

    const existingLines =
      existingReturnIds.length > 0
        ? await tx.select().from(orderReturnLines).where(inArray(orderReturnLines.returnId, existingReturnIds))
        : [];

    const returnedQtyByItem = new Map<string, number>();
    for (const el of existingLines) {
      const cur = returnedQtyByItem.get(el.orderItemId) || 0;
      returnedQtyByItem.set(el.orderItemId, cur + el.quantity);
    }

    // 3. Resolve Lines to return
    const resolvedLines: Array<{
      orderItemId: string;
      productId: string;
      variantId?: string | null;
      quantity: number;
      unitPrice: number;
      unitDiscount: number;
      unitTax: number;
      unitRefund: number;
      unitCost: number;
      gradingStatus: string;
      serialNumber?: string | null;
      reason?: string | null;
    }> = [];

    if (inputLines && inputLines.length > 0) {
      for (const reqLine of inputLines) {
        const item = itemMap.get(reqLine.orderItemId);
        if (!item) {
          throw Object.assign(new Error(`Order item ${reqLine.orderItemId} does not belong to order ${orderId}`), { status: 400 });
        }

        const qtyToReturn = Math.max(1, Number(reqLine.quantity) || 1);
        const previouslyReturned = returnedQtyByItem.get(item.id) || 0;
        const availableToReturn = item.quantity - previouslyReturned;

        if (qtyToReturn > availableToReturn) {
          throw Object.assign(
            new Error(`Cannot return ${qtyToReturn} of item (product: ${item.productId}). Maximum returnable quantity is ${availableToReturn}.`),
            { status: 400 },
          );
        }

        const unitPrice = Number(item.unitPrice);
        const unitDiscount = item.quantity > 0 ? Number(item.discountAmount) / item.quantity : 0;
        const unitTax = item.quantity > 0 ? Number(item.taxAmount) / item.quantity : 0;
        const unitNet = Math.max(0, unitPrice - unitDiscount + unitTax);
        const unitRefund = reqLine.unitRefund != null ? Number(reqLine.unitRefund) : unitNet;
        const unitCost = Number(item.unitCost || 0);

        resolvedLines.push({
          orderItemId: item.id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: qtyToReturn,
          unitPrice,
          unitDiscount,
          unitTax,
          unitRefund,
          unitCost,
          gradingStatus: reqLine.gradingStatus || defaultGrading,
          serialNumber: reqLine.serialNumber || null,
          reason: reqLine.reason || reason,
        });

        returnedQtyByItem.set(item.id, previouslyReturned + qtyToReturn);
      }
    } else {
      // Fallback: Return all remaining unreturned items
      for (const item of items) {
        const previouslyReturned = returnedQtyByItem.get(item.id) || 0;
        const availableToReturn = item.quantity - previouslyReturned;
        if (availableToReturn > 0) {
          const unitPrice = Number(item.unitPrice);
          const unitDiscount = item.quantity > 0 ? Number(item.discountAmount) / item.quantity : 0;
          const unitTax = item.quantity > 0 ? Number(item.taxAmount) / item.quantity : 0;
          const unitNet = Math.max(0, unitPrice - unitDiscount + unitTax);
          const unitCost = Number(item.unitCost || 0);

          resolvedLines.push({
            orderItemId: item.id,
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: availableToReturn,
            unitPrice,
            unitDiscount,
            unitTax,
            unitRefund: unitNet,
            unitCost,
            gradingStatus: defaultGrading,
            serialNumber: null,
            reason,
          });
        }
      }
    }

    if (resolvedLines.length === 0) {
      throw Object.assign(new Error('No remaining items available to return on this order'), { status: 400 });
    }

    // 4. Calculate total refund and cost
    const calculatedRefund = resolvedLines.reduce((sum, l) => sum + l.unitRefund * l.quantity, 0);
    const finalRefund = customRefundAmount != null ? Math.max(0, Number(customRefundAmount)) : calculatedRefund;
    
    // Invariant: total refunds cannot exceed order grandTotal
    const previousTotalRefunds = existingReturns.reduce((sum, r) => sum + Number(r.refundAmount), 0);
    const maxPermittedRefund = Math.max(0, Number(order.grandTotal) - previousTotalRefunds);
    if (finalRefund > maxPermittedRefund + 0.01) {
      throw Object.assign(
        new Error(`Refund amount (${finalRefund.toFixed(2)}) exceeds maximum allowable refundable amount (${maxPermittedRefund.toFixed(2)})`),
        { status: 400 },
      );
    }

    const totalRestockedCost = resolvedLines
      .filter((l) => l.gradingStatus === 'RESTOCKED' || l.gradingStatus === 'GRADED_A' || l.gradingStatus === 'GRADED_B')
      .reduce((sum, l) => sum + l.unitCost * l.quantity, 0);

    const totalDamagedCost = resolvedLines
      .filter((l) => l.gradingStatus === 'DAMAGED' || l.gradingStatus === 'EXPIRED' || l.gradingStatus === 'SCRAP')
      .reduce((sum, l) => sum + l.unitCost * l.quantity, 0);

    const returnNumber = customReturnNo || `RET-${Date.now().toString().slice(-6)}`;

    // 5. Insert orderReturns Header
    const [ret] = await tx
      .insert(orderReturns)
      .values({
        originalOrderId: orderId,
        returnNumber,
        refundAmount: finalRefund.toFixed(2),
        refundDestination,
        restockApproved: Boolean(restockApproved),
        gradingStatus: defaultGrading,
        reason,
        approvedBy: actorId || null,
      })
      .returning();

    // 6. Insert orderReturnLines
    const returnLineInserts = resolvedLines.map((l) => ({
      returnId: ret.id,
      orderItemId: l.orderItemId,
      productId: l.productId,
      variantId: l.variantId || null,
      quantity: l.quantity,
      unitPrice: l.unitPrice.toFixed(2),
      unitDiscount: l.unitDiscount.toFixed(2),
      unitTax: l.unitTax.toFixed(2),
      unitRefund: l.unitRefund.toFixed(2),
      unitCost: l.unitCost.toFixed(2),
      gradingStatus: l.gradingStatus,
      restockedLocationType: 'BRANCH' as const,
      restockedLocationId: order.branchId || null,
      serialNumber: l.serialNumber,
      reason: l.reason,
    }));

    const insertedLines = await tx.insert(orderReturnLines).values(returnLineInserts).returning();

    // 7. Inventory Mutations
    if (order.branchId) {
      for (const line of resolvedLines) {
        const isRestockable = line.gradingStatus === 'RESTOCKED' || line.gradingStatus === 'GRADED_A' || line.gradingStatus === 'GRADED_B';
        if (isRestockable && restockApproved) {
          await recordReturn(
            tx,
            { locationType: 'BRANCH', locationId: order.branchId },
            {
              productId: line.productId,
              variantId: line.variantId || undefined,
              quantity: line.quantity,
              unitCost: line.unitCost,
            },
            {
              referenceType: 'ORDER_RETURN',
              referenceId: ret.id,
              actorId: actorId || null,
              notes: `Line return (${line.gradingStatus}) - ${line.reason || 'Restocked'}`,
            },
          );
        } else if (line.gradingStatus === 'DAMAGED' || line.gradingStatus === 'EXPIRED' || line.gradingStatus === 'SCRAP') {
          await recordDamage(
            tx,
            { locationType: 'BRANCH', locationId: order.branchId },
            {
              productId: line.productId,
              variantId: line.variantId || undefined,
              quantity: line.quantity,
              unitCost: line.unitCost,
            },
            {
              referenceType: 'ORDER_RETURN',
              referenceId: ret.id,
              actorId: actorId || null,
              notes: `Damaged line return (${line.gradingStatus})`,
            },
          );
        }
      }
    }

    // 8. Handle Customer Credit Destination (Polim Potha)
    if (refundDestination === 'CUSTOMER_CREDIT' && order.customerId) {
      const [ppAccount] = await tx
        .select()
        .from(polimPothaAccounts)
        .where(eq(polimPothaAccounts.customerId, order.customerId))
        .limit(1);

      if (ppAccount) {
        const newBalance = Math.max(0, Number(ppAccount.currentBalance) - finalRefund);
        await tx
          .update(polimPothaAccounts)
          .set({ currentBalance: newBalance.toFixed(2), updatedAt: new Date() })
          .where(eq(polimPothaAccounts.id, ppAccount.id));

        await tx.insert(polimPothaEntries).values({
          customerId: order.customerId,
          orderId: order.id,
          type: 'REPAYMENT',
          amount: finalRefund.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          notes: `Credit refund from return ${returnNumber}`,
        });
      }
    }

    // 9. Double-Entry GL Journal Entry
    await ensureDefaultChartOfAccounts(tx as unknown as typeof db);
    const resolveAccount = async (code: string) => {
      const [a] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
      if (!a) throw new Error(`Missing COA account code ${code}`);
      return a.id;
    };

    const aCash = await resolveAccount('1010');
    const aRev = await resolveAccount('4000');
    const aCogs = await resolveAccount('5000');
    const aInv = await resolveAccount('1200');

    const [je] = await tx
      .insert(journalEntries)
      .values({
        entryNumber: `JRN-${ret.returnNumber}`,
        entryDate: new Date(),
        referenceType: 'ORDER_RETURN',
        referenceId: ret.id,
        description: `Order Return ${ret.returnNumber} (${refundDestination})`,
        createdBy: actorId || null,
      })
      .returning();

    const jLines = [
      {
        journalEntryId: je.id,
        accountId: aRev,
        debit: finalRefund.toFixed(2),
        credit: '0.00',
        memo: `Sales return reversal (${returnNumber})`,
      },
      {
        journalEntryId: je.id,
        accountId: aCash,
        debit: '0.00',
        credit: finalRefund.toFixed(2),
        memo: `Refund payout via ${refundDestination}`,
      },
    ];

    if (totalRestockedCost > 0) {
      jLines.push(
        {
          journalEntryId: je.id,
          accountId: aInv,
          debit: totalRestockedCost.toFixed(2),
          credit: '0.00',
          memo: 'Inventory restored to stock',
        },
        {
          journalEntryId: je.id,
          accountId: aCogs,
          debit: '0.00',
          credit: totalRestockedCost.toFixed(2),
          memo: 'COGS relieved for returned goods',
        },
      );
    }

    await tx.insert(journalLines).values(jLines);

    // Update return with journal entry ID
    await tx.update(orderReturns).set({ journalEntryId: je.id }).where(eq(orderReturns.id, ret.id));

    // 10. Update Order Status (FULL vs PARTIAL return)
    const allTotalItemsSold = items.reduce((s, i) => s + i.quantity, 0);
    const allTotalItemsReturned = Array.from(returnedQtyByItem.values()).reduce((s, q) => s + q, 0);
    const isFullyReturned = allTotalItemsReturned >= allTotalItemsSold;

    await tx
      .update(orders)
      .set({
        orderStatus: isFullyReturned ? 'RETURNED' : order.orderStatus,
        paymentStatus: isFullyReturned ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // 11. Immutable Audit Log
    if (actorId) {
      await tx.insert(auditLogs).values({
        actorId,
        action: 'ORDER_RETURN_LINE_PROCESSED',
        entity: 'order_returns',
        entityId: ret.id,
        riskLevel: 'HIGH_RISK_WRITE',
        afterState: {
          returnNumber,
          refundAmount: finalRefund,
          linesReturnedCount: resolvedLines.length,
          isFullyReturned,
        },
      });
    }

    return {
      return: ret,
      lines: insertedLines,
      journalEntryId: je.id,
      summary: {
        returnNumber,
        refundAmount: finalRefund,
        refundDestination,
        itemsCount: resolvedLines.length,
        isFullyReturned,
      },
    };
  });
}
