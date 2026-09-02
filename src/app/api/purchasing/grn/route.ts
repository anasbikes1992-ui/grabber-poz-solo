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

    const actorId =
      receivedBy || (session && !isDemoUserId(session.userId) ? session.userId : undefined);

    const result = await db.transaction(async (tx) => {
      let [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.poNumber, poIdOrNumber)).limit(1);
      if (!po) {
        [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, poIdOrNumber)).limit(1);
      }
      if (!po) throw new Error('Purchase order not found');

      const lines = await tx.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, po.id));
      let totalCost = 0;

      for (const item of items) {
        const line = lines.find((l) => l.productId === item.productId);
        const unitCost = Number(item.unitCost ?? line?.unitCost ?? 0);
        totalCost += unitCost * item.quantity;

        await recordPurchaseReceipt(
          tx,
          { locationType: 'WAREHOUSE', locationId: po.warehouseId },
          {
            productId: item.productId,
            variantId: line?.variantId || null,
            quantity: item.quantity,
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
            qty: item.quantity,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          });
        }

        const [bal] = await tx
          .select()
          .from(stockBalances)
          .where(eq(stockBalances.productId, item.productId))
          .limit(1);
        const onHandAfter = Number(bal?.onHand ?? item.quantity);
        const onHandBefore = Math.max(0, onHandAfter - item.quantity);
        const [prod] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
        if (prod) {
          const oldCost = Number(prod.costPrice);
          const wavg =
            onHandAfter > 0
              ? (oldCost * onHandBefore + unitCost * item.quantity) / onHandAfter
              : unitCost;
          await tx
            .update(products)
            .set({ costPrice: wavg.toFixed(2), updatedAt: new Date() })
            .where(eq(products.id, item.productId));
        }
      }

      await tx
        .update(purchaseOrders)
        .set({ status: 'RECEIVED', totalAmount: String(totalCost.toFixed(2)) })
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
