import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import {
  db,
  purchaseOrders,
  purchaseOrderLines,
  suppliers,
  warehouses,
  products,
} from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET() {
  try {
    const pos = await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt)).limit(100);
    const supplierRows = await db.select().from(suppliers);
    const whRows = await db.select().from(warehouses);
    const sMap = new Map(supplierRows.map((s) => [s.id, s.name]));
    const wMap = new Map(whRows.map((w) => [w.id, w.name]));

    const result = [];
    for (const po of pos) {
      const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, po.id));
      let productSku = '';
      let quantity = 0;
      let unitCost = 0;
      let items = `${lines.length} line(s)`;
      if (lines[0]) {
        const [prod] = await db.select().from(products).where(eq(products.id, lines[0].productId)).limit(1);
        productSku = prod?.sku || '';
        quantity = lines[0].orderedQty;
        unitCost = Number(lines[0].unitCost);
        items = prod ? `${quantity}x ${prod.name}` : items;
      }
      result.push({
        id: po.id,
        poNumber: po.poNumber,
        supplier: sMap.get(po.supplierId) || po.supplierId,
        supplierId: po.supplierId,
        warehouse: wMap.get(po.warehouseId) || po.warehouseId,
        warehouseId: po.warehouseId,
        items,
        productSku,
        productId: lines[0]?.productId,
        quantity,
        unitCost,
        total: Number(po.totalAmount),
        status: po.status,
        date: po.createdAt,
      });
    }

    return NextResponse.json({ success: true, purchaseOrders: result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, purchaseOrders: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const supplierId = body.supplierId as string;
    let warehouseId = body.warehouseId as string | undefined;
    const items = (body.items || []) as Array<{ productId: string; quantity: number; unitCost: number }>;
    if (!supplierId || !items.length) {
      return NextResponse.json({ success: false, error: 'supplierId and items required' }, { status: 400 });
    }
    if (!warehouseId) {
      const [wh] = await db.select().from(warehouses).limit(1);
      warehouseId = wh?.id;
    }
    if (!warehouseId) throw new Error('No warehouse — run POST /api/seed');

    const poNumber = body.poNumber || `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    let total = 0;
    for (const i of items) total += Number(i.unitCost) * Number(i.quantity);

    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;

    const result = await db.transaction(async (tx) => {
      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          poNumber,
          supplierId,
          warehouseId: warehouseId!,
          status: body.status || 'APPROVED',
          totalAmount: total.toFixed(2),
          createdBy: actorId || null,
        })
        .returning();

      for (const i of items) {
        const qty = Number(i.quantity);
        const unitCost = Number(i.unitCost);
        await tx.insert(purchaseOrderLines).values({
          poId: po.id,
          productId: i.productId,
          orderedQty: qty,
          receivedQty: 0,
          unitCost: unitCost.toFixed(2),
          totalCost: (unitCost * qty).toFixed(2),
        });
      }
      return po;
    });

    return NextResponse.json({ success: true, purchaseOrder: result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
