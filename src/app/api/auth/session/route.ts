import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth/session';
import { db, businessProfile } from '@/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let shopName = session.name;
  try {
    const [profile] = await db.select().from(businessProfile).limit(1);
    if (profile?.name) shopName = profile.name;
  } catch {
    // DB optional in dev
  }

  return NextResponse.json({
    authenticated: true,
    user: session,
    email: session.email,
    shopName,
  });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
