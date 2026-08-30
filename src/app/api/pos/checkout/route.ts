import { NextResponse } from 'next/server';
import { defaultCommerceService } from '@/lib/commerce/commerce-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      channel = 'POS',
      fulfillmentLocationType = 'BRANCH',
      fulfillmentLocationId,
      branchId,
      registerId,
      customerId,
      customerName,
      items,
      paymentMethod,
      amount,
    } = body;

    // 1. Create order and reserve stock
    const orderNumber = `POS-${Date.now().toString().slice(-6)}`;
    const order = defaultCommerceService.createOrder({
      orderNumber,
      channel,
      fulfillmentLocationType,
      fulfillmentLocationId: fulfillmentLocationId || branchId,
      branchId,
      registerId,
      customerId,
      customerName,
      items,
    });

    // 2. Process tender payment
    const paymentRes = defaultCommerceService.processPayment({
      orderId: order.id,
      method: paymentMethod || 'CASH',
      amount: amount || order.pricing.grandTotal,
    });

    // 3. Fulfill POS order immediately
    const fulfilled = defaultCommerceService.fulfillOrder({
      orderId: order.id,
    });

    return NextResponse.json({
      success: true,
      order: fulfilled,
      journalEntry: paymentRes.journalEntry,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}
