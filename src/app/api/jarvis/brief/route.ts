import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { buildDailyBrief } from '@/lib/ai/daily-brief';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const brief = await buildDailyBrief();
    return NextResponse.json({ success: true, brief });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
