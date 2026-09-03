import { NextResponse } from 'next/server';
import { buildSerialLifecycle } from '@/lib/serials/lifecycle';
import { db } from '@/db';
import { requireStaffSession } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    await requireStaffSession();
    const imei = new URL(req.url).searchParams.get('imei')?.trim();
    if (!imei) return NextResponse.json({ success: false, error: 'imei required' }, { status: 400 });

    const result = await buildSerialLifecycle(db, imei);
    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
