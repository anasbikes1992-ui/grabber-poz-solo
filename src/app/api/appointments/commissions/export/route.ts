import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { exportCommissionCsv } from '@/lib/salon/commission-export';

/** VERT-S05 — CSV export of completed appointment commissions. */
export async function GET(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'dev@localhost',
        name: 'Dev',
        role: 'OWNER',
      };
    } else {
      assertCanMutateCommerce(session);
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;
    if (searchParams.get('summary') === '1') {
      const { summary } = await exportCommissionCsv({ from, to });
      return NextResponse.json({ success: true, summary });
    }

    const { csv } = await exportCommissionCsv({ from, to });
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="stylist-commissions-${stamp}.csv"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
