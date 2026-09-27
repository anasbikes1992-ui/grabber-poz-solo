import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  db,
  purchaseOrders,
  purchaseOrderLines,
  stockBalances,
  supplierAccounts,
  supplierEntries,
  journalEntries,
  journalLines,
  chartOfAccounts,
  products,
} from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { recordPurchaseReceipt } from '@/lib/inventory/stock-service';
import { receiveStockLot } from '@/lib/inventory/fefo';

type GrnLine = {
  id: string;
  productId: string;
  variantId?: string | null;
  orderedQty: number | string;
  receivedQty: number | string;
  unitCost: number | string;
};

export function assertReceivablePurchaseOrder(status: string) {
  if (['CANCELLED', 'RECEIVED', 'CLOSED'].includes(status.toUpperCase())) {
    throw Object.assign(new Error(`Purchase order status ${status} cannot receive GRN`), { status: 400 });
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

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const { poIdOrNumber, items, receivedBy } = body as {
      poIdOrNumber: string;
      items: Array<{ productId: string; quantity: number; unitCost?: number; batchCode?: string; expiryDate?: string }>;
      receivedBy?: string;
    };
    if (!poIdOrNumber || !items?.length) {
      return NextResponse.json({ success: false, error: 'poIdOrNumber and items required' }, { status: 400 });
    }

    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;

    const result = await db.transaction(async (tx) => {
      let [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.poNumber, poIdOrNumber)).limit(1);
      if (!po) {
        [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, poIdOrNumber)).limit(1);
      }
      if (!po) throw new Error('Purchase order not found');
      assertReceivablePurchaseOrder(po.status);

      const lines = await tx.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, po.id));
      let totalCost = 0;

      for (const item of items) {
        const quantity = normalizeGrnQuantity(item.quantity);
        const line = assertCanReceiveLine(lines.find((l) => l.productId === item.productId), item.productId, quantity);
        const unitCost = Number(item.unitCost ?? line?.unitCost ?? 0);
        totalCost += unitCost * quantity;

        await recordPurchaseReceipt(
          tx,
          { locationType: 'WAREHOUSE', locationId: po.warehouseId },
          {
            productId: item.productId,
            variantId: line?.variantId || null,
            quantity,
            unitCost,
          },
          {
            referenceType: 'PURCHASE_ORDER',
            referenceId: po.id,
            actorId: actorId || null,
          },
        );

        if (item.batchCode) {
          await receiveStockLot(tx, {
            batchCode: item.batchCode,
            productId: item.productId,
            variantId: line?.variantId || null,
            locationType: 'WAREHOUSE',
            locationId: po.warehouseId,
            qty: quantity,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          });
        }

        const balances = await tx
          .select()
          .from(stockBalances)
          .where(eq(stockBalances.productId, item.productId));
        const onHandAfter = balances.reduce((sum, bal) => sum + Number(bal.onHand || 0), 0);
        const [prod] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
        if (prod) {
          const oldCost = Number(prod.costPrice);
          const wavg = nextWeightedAverageCost(oldCost, onHandAfter, quantity, unitCost);
          await tx
            .update(products)
            .set({ costPrice: wavg.toFixed(2), updatedAt: new Date() })
            .where(eq(products.id, item.productId));
        }

        if (line) {
          const newReceived = (Number(line.receivedQty) || 0) + quantity;
          await tx
            .update(purchaseOrderLines)
            .set({ receivedQty: newReceived })
            .where(eq(purchaseOrderLines.id, line.id));
        }
      }

      const allLines = await tx.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, po.id));
      const allFullyReceived = allLines.length > 0 && allLines.every((l) => Number(l.receivedQty) >= Number(l.orderedQty));
      const anyReceived = allLines.some((l) => Number(l.receivedQty) > 0);
      const nextPoStatus = allFullyReceived ? 'RECEIVED' : (anyReceived ? 'PARTIALLY_RECEIVED' : po.status);

      await tx
        .update(purchaseOrders)
        .set({ status: nextPoStatus })
        .where(eq(purchaseOrders.id, po.id));

      const [acct] = await tx
        .select()
        .from(supplierAccounts)
        .where(eq(supplierAccounts.supplierId, po.supplierId))
        .limit(1);
      if (acct) {
        const next = Number(acct.currentBalance) + totalCost;
        await tx
          .update(supplierAccounts)
          .set({ currentBalance: String(next.toFixed(2)), updatedAt: new Date() })
          .where(eq(supplierAccounts.supplierId, po.supplierId));
        await tx.insert(supplierEntries).values({
          supplierId: po.supplierId,
          poId: po.id,
          type: 'BILL',
          amount: String(totalCost.toFixed(2)),
          balanceAfter: String(next.toFixed(2)),
          createdBy: actorId || null,
        });
      }

      const resolve = async (code: string) => {
        const [a] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
        if (!a) throw new Error(`Missing COA ${code}`);
        return a.id;
      };
      const aInv = await resolve('1200');
      const aAp = await resolve('2000');
      const [je] = await tx
        .insert(journalEntries)
        .values({
          entryNumber: `JRN-GRN-${po.poNumber}-${Date.now().toString().slice(-4)}`,
          entryDate: new Date(),
          referenceType: 'PURCHASE_ORDER',
          referenceId: po.id,
          description: `GRN for ${po.poNumber}`,
          createdBy: actorId || null,
        })
        .returning();
      await tx.insert(journalLines).values([
        { journalEntryId: je.id, accountId: aInv, debit: String(totalCost.toFixed(2)), credit: '0.00', memo: 'Inventory in' },
        { journalEntryId: je.id, accountId: aAp, debit: '0.00', credit: String(totalCost.toFixed(2)), memo: 'AP liability' },
      ]);

      return { poId: po.id, poNumber: po.poNumber, totalCost, journalEntryId: je.id };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}
