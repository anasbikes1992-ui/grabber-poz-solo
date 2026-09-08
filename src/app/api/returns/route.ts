import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, orderReturns, orderReturnLines, orders } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { processOrderReturn } from '@/lib/returns/returns-service';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (orderId) {
      const returns = await db
        .select()
        .from(orderReturns)
        .where(eq(orderReturns.originalOrderId, orderId))
        .orderBy(desc(orderReturns.createdAt));

      const returnIds = returns.map((r) => r.id);
      const lines = returnIds.length > 0
        ? await db.select().from(orderReturnLines).where(eq(orderReturnLines.returnId, returnIds[0]))
        : [];

      return NextResponse.json({ success: true, returns, lines });
    }

    const returns = await db.select().from(orderReturns).orderBy(desc(orderReturns.createdAt)).limit(100);
    return NextResponse.json({ success: true, returns });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;

    const result = await processOrderReturn({
      orderId: String(body.orderId || ''),
      returnNumber: body.returnNumber ? String(body.returnNumber) : undefined,
      reason: body.reason ? String(body.reason) : undefined,
      refundDestination: body.refundDestination,
      restockApproved: body.restockApproved != null ? Boolean(body.restockApproved) : true,
      gradingStatus: body.gradingStatus,
      lines: Array.isArray(body.lines) ? body.lines : undefined,
      refundAmount: body.refundAmount != null ? Number(body.refundAmount) : undefined,
      actorId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}
