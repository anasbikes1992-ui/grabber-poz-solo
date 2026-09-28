import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { loadFulfillmentOrder, renderFulfillmentDocument } from '@/lib/orders/fulfillment-documents';

type RouteCtx = { params: Promise<{ orderNumber: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const session = await getSession();
  if (process.env.NODE_ENV === 'production' && !session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const { orderNumber } = await ctx.params;
  const order = await loadFulfillmentOrder(orderNumber);
  if (!order) return new NextResponse('Order not found', { status: 404 });
  return new NextResponse(renderFulfillmentDocument('pick-list', order), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
