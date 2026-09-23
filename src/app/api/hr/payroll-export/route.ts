import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { exportEpfFormCCsv, exportEtfR1Csv } from '@/lib/hr/payroll-export';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

/** GET /api/hr/payroll-export?runId=&type=epf|etf */
export async function GET(req: Request) {
  try {
    await actor();
    const url = new URL(req.url);
    const runId = url.searchParams.get('runId');
    const type = String(url.searchParams.get('type') || 'epf').toLowerCase();
    if (!runId) {
      return NextResponse.json({ success: false, error: 'runId required' }, { status: 400 });
    }

    const result = type === 'etf' ? await exportEtfR1Csv(runId) : await exportEpfFormCCsv(runId);

    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
