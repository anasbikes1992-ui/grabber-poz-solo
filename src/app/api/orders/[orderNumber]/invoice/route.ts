import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, customers, orderItems, orders, products } from '@/db';
import { verifyOrderAccess } from '@/lib/tracking/order-tracker';

type RouteCtx = { params: Promise<{ orderNumber: string }> };

/** Printable tax invoice (HTML) for public tracker */
export async function GET(req: Request, ctx: RouteCtx) {
  try {
    const { orderNumber } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const phoneLast4 = searchParams.get('phoneLast4')?.trim();
    const token = searchParams.get('token')?.trim();

    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
    if (!order) return new NextResponse('Order not found', { status: 404 });

    let customerPhone: string | undefined;
    let customerName = 'Customer';
    if (order.customerId) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
      customerPhone = cust?.phone;
      customerName = cust?.name || customerName;
    }

    if (!verifyOrderAccess(order, customerPhone, { phoneLast4, token })) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const rows = [];
    for (const item of items) {
      const [p] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      rows.push({
        name: p?.name || 'Item',
        qty: item.quantity,
        unitPrice: Number(item.unitPrice),
        tax: Number(item.taxAmount),
        total: Number(item.lineTotal),
      });
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Tax Invoice ${order.orderNumber}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:1rem;color:#111}
h1{font-size:1.25rem} table{width:100%;border-collapse:collapse;margin:1rem 0}
th,td{border:1px solid #ccc;padding:.5rem;text-align:left;font-size:.875rem}
tfoot td{font-weight:bold}.meta{color:#555;font-size:.8rem}
@media print{button{display:none}}
</style></head><body>
<h1>Tax Invoice</h1>
<p class="meta">Order: ${order.orderNumber}<br/>Date: ${new Date(order.createdAt).toLocaleString()}<br/>Customer: ${customerName}</p>
<table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>VAT</th><th>Total</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${r.name}</td><td>${r.qty}</td><td>${r.unitPrice.toFixed(2)}</td><td>${r.tax.toFixed(2)}</td><td>${r.total.toFixed(2)}</td></tr>`).join('')}
</tbody><tfoot>
<tr><td colspan="4">Subtotal</td><td>${Number(order.subtotal).toFixed(2)}</td></tr>
<tr><td colspan="4">Discount</td><td>-${Number(order.discountTotal).toFixed(2)}</td></tr>
<tr><td colspan="4">VAT 18%</td><td>${Number(order.taxTotal).toFixed(2)}</td></tr>
<tr><td colspan="4">Grand Total (LKR)</td><td>${Number(order.grandTotal).toFixed(2)}</td></tr>
</tfoot></table>
<button onclick="window.print()">Print / Save as PDF</button>
</body></html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${order.orderNumber}.html"`,
      },
    });
  } catch (err: unknown) {
    return new NextResponse((err as Error).message, { status: 500 });
  }
}
