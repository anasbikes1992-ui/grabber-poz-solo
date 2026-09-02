import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, products, stockBalances, stockTakeLines, stockTakeSessions } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import {
  addStockTakeCounts,
  approveAndPostStockTake,
  createStockTakeSession,
} from '@/lib/inventory/stock-take';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET(req: Request) {
  try {
    const sessionId = new URL(req.url).searchParams.get('sessionId');
    if (sessionId) {
      const [session] = await db.select().from(stockTakeSessions).where(eq(stockTakeSessions.id, sessionId)).limit(1);
      const lines = await db.select().from(stockTakeLines).where(eq(stockTakeLines.sessionId, sessionId));
      return NextResponse.json({ success: true, session, lines });
    }
    const sessions = await db.select().from(stockTakeSessions).limit(20);
    return NextResponse.json({ success: true, sessions });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const action = body.action || 'start';
    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;

    if (action === 'start') {
      const row = await createStockTakeSession(db, {
        locationType: body.locationType || 'BRANCH',
        locationId: body.locationId,
        actorId,
      });
      return NextResponse.json({ success: true, session: row });
    }

    if (action === 'count') {
      const linesInput = (body.lines || []) as Array<{
        productId: string;
        variantId?: string;
        physicalCount: number;
        barcode?: string;
      }>;

      const enriched = [];
      for (const line of linesInput) {
        const [bal] = await db
          .select()
          .from(stockBalances)
          .where(eq(stockBalances.productId, line.productId))
          .limit(1);
        const [prod] = await db.select().from(products).where(eq(products.id, line.productId)).limit(1);
        enriched.push({
          productId: line.productId,
          variantId: line.variantId,
          physicalCount: line.physicalCount,
          systemOnHand: bal?.onHand ?? 0,
          unitCost: Number(prod?.costPrice || 0),
        });
      }

      const result = await addStockTakeCounts(db, body.sessionId, enriched);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'approve') {
      const result = await approveAndPostStockTake(db, body.sessionId, actorId);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
