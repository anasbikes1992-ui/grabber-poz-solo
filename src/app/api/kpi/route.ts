import { NextResponse } from 'next/server';
import { computeKpis, parseKpiIds } from '@/lib/analytics/kpi-registry';
import { getSession } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ids = parseKpiIds(searchParams.get('ids'));
    const kpis = await computeKpis(ids);

    return NextResponse.json({ success: true, ids, kpis });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
