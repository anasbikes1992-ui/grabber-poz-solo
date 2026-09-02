import { NextResponse } from 'next/server';
import { buildSerialLifecycle } from '@/lib/serials/lifecycle';
import { db } from '@/db';

export async function GET(req: Request) {
  try {
    const imei = new URL(req.url).searchParams.get('imei')?.trim();
    if (!imei) return NextResponse.json({ success: false, error: 'imei required' }, { status: 400 });

    const result = await buildSerialLifecycle(db, imei);
    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
