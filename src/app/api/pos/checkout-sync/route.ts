import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db, orders, orderItems, stockBalances, stockMovements } from '@/db';
import { eq, sql } from 'drizzle-orm';
import { OfflinePosSyncEngine, type OfflineSaleTransaction } from '@/lib/pos/offline-sync';
import { PricingEngine } from '@/lib/commerce/pricing-engine';
import { requireStaffSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    await requireStaffSession();

    const body = await req.json();
    const batch: OfflineSaleTransaction[] = Array.isArray(body.transactions) ? body.transactions : [body];

    const results = [];
    const pricingEngine = new PricingEngine();

    for (const tx of batch) {
      const validation = OfflinePosSyncEngine.validateOfflineTransaction(tx);
      if (!validation.valid) {
        results.push({ clientTxId: tx.clientTxId || tx.offlineId, success: false, error: validation.error });
        continue;
      }

      const txId = tx.clientTxId || tx.offlineId || `off_${Date.now()}`;

      // Check if already synced (idempotent lookup via clientUuid)
      const existing = await db
        .select({ id: orders.id, orderNumber: orders.orderNumber })
        .from(orders)
        .where(eq(orders.clientUuid, txId))
        .limit(1);

      if (existing.length > 0) {
        results.push({
          clientTxId: txId,
          success: true,
          orderId: existing[0].id,
          orderNumber: existing[0].orderNumber,
          alreadySynced: true,
        });
        continue;
      }

      // Calculate server authoritative pricing
      const pricing = pricingEngine.calculateTotals(
        tx.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          name: i.name || 'POS Item',
          unitPrice: i.unitPrice,
          unitCost: i.unitCost,
          quantity: i.quantity,
          lineDiscount: i.lineDiscount,
        })),
      );

      const orderNumber = `POS-${Date.now().toString().slice(-6)}`;

      // Execute transaction in DB
      const [newOrder] = await db
        .insert(orders)
        .values({
          orderNumber,
          channel: 'POS',
          orderStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
          fulfillmentStatus: 'DELIVERED',
          grandTotal: String(pricing.grandTotal),
          subtotal: String(pricing.subtotal),
          taxTotal: String(pricing.taxTotal),
          discountTotal: String(pricing.totalDiscount),
          branchId: tx.branchId,
          clientUuid: txId,
          terminalId: tx.registerId || tx.terminalId,
        })
        .returning();

      // Insert order items & adjust stock
      for (const line of pricing.lines) {
        await db.insert(orderItems).values({
          orderId: newOrder.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: String(line.unitPrice),
          unitCost: String(line.unitCost),
          discountAmount: String(line.lineDiscount || 0),
          taxAmount: '0.00',
          lineTotal: String(line.netLineTotal),
        });

        // Decrement stock balance
        await db
          .update(stockBalances)
          .set({
            onHand: sql`${stockBalances.onHand} - ${line.quantity}`,
          })
          .where(eq(stockBalances.productId, line.productId));

        // Record stock movement if branch location is known
        if (tx.branchId) {
          await db.insert(stockMovements).values({
            locationType: 'BRANCH',
            locationId: tx.branchId,
            productId: line.productId,
            type: 'SALE',
            delta: -line.quantity,
            unitCost: String(line.unitCost),
            referenceType: 'ORDER',
            referenceId: newOrder.id,
            notes: 'Offline POS checkout sync',
          });
        }
      }

      results.push({
        clientTxId: txId,
        success: true,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
      });
    }

    return NextResponse.json({
      success: true,
      syncedCount: results.filter((r) => r.success).length,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: (err as { status?: number }).status || 500 },
    );
  }
}
