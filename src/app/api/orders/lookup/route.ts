import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, orders, orderItems } from '@/db';
import { getSession } from '@/lib/auth/session';

/** Lookup order by UUID or bill/order number for returns UI */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || searchParams.get('orderNumber') || searchParams.get('id') || '').trim();
    if (!q) {
      return NextResponse.json({ success: false, error: 'q / orderNumber / id required' }, { status: 400 });
    }

    let [order] = await db.select().from(orders).where(eq(orders.orderNumber, q)).limit(1);
    if (!order) {
      [order] = await db.select().from(orders).where(eq(orders.id, q)).limit(1);
    }
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        grandTotal: order.grandTotal,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
      },
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
