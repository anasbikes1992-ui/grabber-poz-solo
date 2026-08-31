import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import {
  db,
  purchaseOrders,
  purchaseOrderLines,
  stockBalances,
  stockMovements,
  supplierAccounts,
  supplierEntries,
  journalEntries,
  journalLines,
  chartOfAccounts,
  products,
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
    const { poIdOrNumber, items, receivedBy } = body as {
      poIdOrNumber: string;
      items: Array<{ productId: string; quantity: number; unitCost?: number }>;
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

        const updated = await tx
          .update(stockBalances)
          .set({
            onHand: sql`${stockBalances.onHand} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(stockBalances.productId, item.productId))
          .returning({ id: stockBalances.id, onHand: stockBalances.onHand });

        if (updated.length === 0) {
          await tx.insert(stockBalances).values({
            locationType: 'WAREHOUSE',
            locationId: po.warehouseId,
            productId: item.productId,
            onHand: item.quantity,
            reserved: 0,
            damaged: 0,
          });
        }

        // Weighted average cost on product
        const [prod] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
        if (prod) {
          const [bal] = await tx.select().from(stockBalances).where(eq(stockBalances.productId, item.productId)).limit(1);
          const onHandAfter = Number(bal?.onHand ?? item.quantity);
          const onHandBefore = Math.max(0, onHandAfter - item.quantity);
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

        await tx.insert(stockMovements).values({
          locationType: 'WAREHOUSE',
          locationId: po.warehouseId,
          productId: item.productId,
          type: 'PURCHASE_RECEIPT',
          delta: item.quantity,
          unitCost: String(unitCost.toFixed(2)),
          referenceType: 'PURCHASE_ORDER',
          referenceId: po.id,
          actorId: actorId || null,
        });
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
