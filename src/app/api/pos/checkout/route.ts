import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db, userAssignments, users } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId, verifyPin } from '@/lib/auth/session';
import { getCustomerSession } from '@/lib/auth/customer-session';
import { processPosCheckout } from '@/lib/commerce/pos-checkout-service';

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

    let assignedBranchIds: string[] | undefined;
    if (session && session.role !== 'OWNER' && session.role !== 'ADMIN' && !isDemoUserId(session.userId)) {
      const rows = await db
        .select()
        .from(userAssignments)
        .where(eq(userAssignments.userId, session.userId));
      assignedBranchIds = rows.map((r) => r.branchId).filter(Boolean) as string[];
    }

    // CI-004-F: Verify Manager/Owner PIN override before honoring overrideRole
    let authorizedOverrideRole: any = undefined;
    let authorizedOverrideUserId: string | undefined = undefined;

    if (body.overrideRole) {
      if (session?.role === 'OWNER' || session?.role === 'ADMIN') {
        authorizedOverrideRole = session.role;
      } else if (body.overridePin) {
        // Authenticate the supervisor granting the override
        const targetUserId = body.overrideUserId;
        const privilegedUsers = targetUserId
          ? await db.select().from(users).where(eq(users.id, targetUserId)).limit(1)
          : await db.select().from(users).where(inArray(users.role, ['OWNER', 'ADMIN', 'MANAGER']));

        for (const supervisor of privilegedUsers) {
          if (supervisor.active && verifyPin(body.overridePin, supervisor.hashedPin)) {
            authorizedOverrideRole = supervisor.role;
            authorizedOverrideUserId = supervisor.id;
            break;
          }
        }
      }
      // If PIN was missing or invalid, authorizedOverrideRole remains undefined (default deny)
    }

    const rawLines = Array.isArray(body.items) ? body.items : Array.isArray(body.lines) ? body.lines : [];

    const result = await processPosCheckout({
      channel,
      branchId: body.branchId,
      fulfillmentLocationId: body.fulfillmentLocationId,
      assignedBranchIds,
      items: rawLines,
      discountTotal: body.discountTotal,
      discountPercent: body.discountPercent,
      staffRole: session?.role as any,
      overrideRole: authorizedOverrideRole,
      overrideUserId: authorizedOverrideUserId,
      promoCode: body.promoCode,
      tradeInVoucherNumber: body.tradeInVoucherNumber,
      tradeInCredit: body.tradeInCredit,
      payments: body.payments,
      paymentMethod: body.paymentMethod,
      amount: body.amount,
      customerId: body.customerId,
      orderNumber: body.orderNumber,
      registerId: body.registerId,
      shiftId: body.shiftId,
      clientUuid: body.clientUuid,
      idempotencyKey: body.idempotencyKey || body.clientUuid,
      terminalId: body.terminalId,
      clientSequence: body.clientSequence,
      offlineSync: body.offlineSync,
      allowStockUnderrun: body.allowStockUnderrun,
      shopperCustomerId: isStorefront && shopper ? shopper.customerId : undefined,
      actorId: session && !isDemoUserId(session.userId) ? session.userId : undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json(
      { success: false, error: e.message || 'Checkout failed' },
      { status: e.status || 400 },
    );
  }
}
