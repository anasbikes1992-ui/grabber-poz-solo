import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, repairJobs } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { addRepairPartFromStock, getPartsLines } from '@/lib/repairs/parts-from-stock';

type RouteParams = { params: Promise<{ id: string }> };

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    await actor();
    const { id } = await params;
    const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, id)).limit(1);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Repair job not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      partsLines: getPartsLines(job.checklistJson),
      partsAmount: job.partsAmount,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await actor();
    const { id } = await params;
    const body = await req.json();
    const productId = String(body.productId || '');
    const qty = Number(body.qty ?? 1);
    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId required' }, { status: 400 });
    }

    const result = await addRepairPartFromStock({
      repairJobId: id,
      productId,
      variantId: body.variantId || null,
      qty,
      actorId: session && !isDemoUserId(session.userId) ? session.userId : null,
    });

    return NextResponse.json({
      success: true,
      job: result.job,
      line: result.line,
      partsLines: result.partsLines,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
