import { NextResponse } from 'next/server';
import { listCollection } from '@/lib/db/app-collections';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const warranties = await listCollection<{ id: string } & Record<string, unknown>>('warranties');
    return NextResponse.json({ success: true, warranties });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message, warranties: [] }, { status: 500 });
  }
}
