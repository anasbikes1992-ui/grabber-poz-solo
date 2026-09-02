import { eq, ilike, or } from 'drizzle-orm';
import {
  hirePurchaseContracts,
  orders,
  products,
  repairJobs,
  serialNumbers,
  stockMovements,
  transfers,
} from '@/db/schema';

export type LifecycleEvent = {
  at: Date | string;
  stage: string;
  detail: string;
  referenceType?: string;
  referenceId?: string;
};

export async function buildSerialLifecycle(
  db: { select: typeof import('@/db').db.select },
  imei: string,
) {
  const serial = imei.trim().toUpperCase();
  const [row] = await db
    .select({ serial: serialNumbers, product: products })
    .from(serialNumbers)
    .innerJoin(products, eq(serialNumbers.productId, products.id))
    .where(or(eq(serialNumbers.serial, serial), ilike(serialNumbers.serial, serial)))
    .limit(1);

  if (!row) return { error: 'Serial / IMEI not found' as const };

  const events: LifecycleEvent[] = [
    {
      at: row.serial.createdAt,
      stage: 'REGISTERED',
      detail: `Serial registered for ${row.product.name}`,
      referenceType: 'SERIAL',
      referenceId: row.serial.id,
    },
  ];

  const movements = await db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.productId, row.serial.productId))
    .limit(200);

  for (const m of movements) {
    if (m.referenceType === 'PURCHASE_ORDER' || m.type === 'PURCHASE_RECEIPT') {
      events.push({
        at: m.createdAt,
        stage: 'PO_RECEIPT',
        detail: `GRN +${m.delta} @ ${m.locationType}`,
        referenceType: m.referenceType || undefined,
        referenceId: m.referenceId || undefined,
      });
    } else if (m.type === 'TRANSFER_IN' || m.type === 'TRANSFER_OUT') {
      events.push({
        at: m.createdAt,
        stage: m.type === 'TRANSFER_IN' ? 'TRANSFER_IN' : 'TRANSFER_OUT',
        detail: `${m.type} ${m.delta} units`,
        referenceType: m.referenceType || 'TRANSFER',
        referenceId: m.referenceId || undefined,
      });
    } else if (m.type === 'SALE') {
      events.push({
        at: m.createdAt,
        stage: 'POS_SALE',
        detail: `Sold (${m.delta} units)`,
        referenceType: m.referenceType || 'ORDER',
        referenceId: m.referenceId || undefined,
      });
    }
  }

  if (row.serial.orderId) {
    const [order] = await db.select().from(orders).where(eq(orders.id, row.serial.orderId)).limit(1);
    if (order) {
      events.push({
        at: order.createdAt,
        stage: 'POS_SALE',
        detail: `Order ${order.orderNumber} · LKR ${Number(order.grandTotal).toLocaleString()}`,
        referenceType: 'ORDER',
        referenceId: order.id,
      });
    }
  }

  const hpRows = await db
    .select()
    .from(hirePurchaseContracts)
    .where(eq(hirePurchaseContracts.productId, row.serial.productId))
    .limit(10);
  for (const hp of hpRows) {
    events.push({
      at: hp.createdAt,
      stage: 'HIRE_PURCHASE',
      detail: `HP ${hp.contractNumber} · EMI LKR ${Number(hp.monthlyEmi)}`,
      referenceType: 'HP_CONTRACT',
      referenceId: hp.id,
    });
  }

  const repairs = await db.select().from(repairJobs).limit(100);
  for (const r of repairs) {
    const checklist = r.checklistJson as { imei?: string } | null;
    if (checklist?.imei?.toUpperCase() === serial || r.deviceModel.toUpperCase().includes(serial.slice(-4))) {
      events.push({
        at: r.updatedAt,
        stage: 'REPAIR',
        detail: `${r.jobNumber} · ${r.status} — ${r.primaryFault || 'Service'}`,
        referenceType: 'REPAIR',
        referenceId: r.id,
      });
    }
  }

  const transferRows = await db.select().from(transfers).limit(50);
  for (const t of transferRows) {
    events.push({
      at: t.createdAt,
      stage: 'TRANSFER',
      detail: `${t.transferNumber} · ${t.status}`,
      referenceType: 'TRANSFER',
      referenceId: t.id,
    });
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return {
    serial: {
      imei: row.serial.serial,
      status: row.serial.status,
      productName: row.product.name,
      sku: row.product.sku,
      locationType: row.serial.locationType,
      locationId: row.serial.locationId,
      warrantyExpires: row.serial.warrantyExpires,
      orderId: row.serial.orderId,
    },
    events,
  };
}
