import { NextResponse } from 'next/server';
import { db, users } from '@/db';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const rows = await db.select().from(users).limit(50);
    return NextResponse.json({
      success: true,
      staff: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
      })),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message, staff: [] }, { status: 500 });
  }
}
