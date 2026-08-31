import { NextResponse } from 'next/server';
import { db, branches } from '@/db';
import { durableCheckout } from '@/lib/db/repositories/checkout-repo';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { getCustomerSession } from '@/lib/auth/customer-session';

type BodyLine = {
  productId?: string;
  id?: string;
  qty?: number;
  quantity?: number;
  unitPrice?: number;
  name?: string;
  unitCost?: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const channel = (body.channel || 'POS') as string;
    const isStorefront = channel === 'STOREFRONT';

    let session = await getSession();
    const shopper = await getCustomerSession();

    if (isStorefront) {
      if (!shopper && process.env.NODE_ENV === 'production' && process.env.AUTH_OPTIONAL !== 'true') {
        return NextResponse.json({ success: false, error: 'Sign in as a customer to checkout' }, { status: 401 });
      }
    } else if (!session && process.env.NODE_ENV !== 'production') {
      session = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'dev@localhost',
        name: 'Dev',
        role: 'OWNER',
      };
    } else {
      assertCanMutateCommerce(session);
    }

    let branchId = body.branchId || body.fulfillmentLocationId;
    if (!branchId) {
      const [b] = await db.select().from(branches).limit(1);
      branchId = b?.id;
    }
    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId is required — run POST /api/seed' },
        { status: 400 },
      );
    }

    const rawLines: BodyLine[] = Array.isArray(body.items)
      ? body.items
      : Array.isArray(body.lines)
        ? body.lines
        : [];

    const items = rawLines.map((l) => ({
      productId: String(l.productId || l.id),
      name: l.name,
      quantity: Number(l.quantity ?? l.qty ?? 0),
      unitPrice: Number(l.unitPrice ?? 0),
      unitCost: l.unitCost != null ? Number(l.unitCost) : undefined,
    }));

    const payFromArray = Array.isArray(body.payments) && body.payments[0];
    let paymentMethod = String(
      body.paymentMethod || payFromArray?.method || (isStorefront ? 'CARD' : 'CASH'),
    ).toUpperCase();
    if (paymentMethod === 'SPLIT') paymentMethod = 'CASH';

    const amount =
      body.amount != null
        ? Number(body.amount)
        : payFromArray?.amount != null
          ? Number(payFromArray.amount)
          : undefined;

    const customerId =
      body.customerId || (isStorefront && shopper ? shopper.customerId : undefined);

    const orderNumber =
      body.orderNumber ||
      (isStorefront ? `WEB-${Date.now().toString().slice(-8)}` : undefined);

    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;

    const result = await durableCheckout({
      orderNumber,
      channel: channel as 'POS' | 'STOREFRONT' | 'WHATSAPP' | 'JARVIS' | 'MANUAL' | 'IMPORT' | 'API',
      branchId,
      registerId: body.registerId,
      shiftId: body.shiftId,
      customerId,
      items,
      paymentMethod: paymentMethod as 'CASH' | 'CARD' | 'CREDIT' | 'COD' | 'PAYHERE' | 'WEBXPAY' | 'STRIPE',
      amount,
      clientUuid: body.clientUuid,
      idempotencyKey: body.idempotencyKey || body.clientUuid,
      actorId,
      discountTotal: body.discountTotal,
    });

    return NextResponse.json({
      success: true,
      reused: result.reused,
      orderNumber: result.order?.orderNumber,
      order: result.order,
      payment: 'payment' in result ? result.payment : null,
      journalEntryId: 'journalEntryId' in result ? result.journalEntryId : null,
      grandTotal: 'grandTotal' in result ? result.grandTotal : Number(result.order?.grandTotal),
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json(
      { success: false, error: e.message || 'Checkout failed' },
      { status: e.status || 400 },
    );
  }
}
