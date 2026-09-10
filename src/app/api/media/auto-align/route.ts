import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, requireStaffSession } from '@/lib/auth/session';
import { bulkAutoAlignMedia } from '@/lib/media/media-service';

export async function POST() {
  try {
    assertCanMutateCommerce(await requireStaffSession());
    const result = await bulkAutoAlignMedia();
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Auto-alignment failed' }, { status: e.status || 500 });
  }
}
