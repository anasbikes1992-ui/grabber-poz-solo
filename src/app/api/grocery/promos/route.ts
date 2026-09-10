import { NextResponse } from 'next/server';
import { suggestNearExpiryPromos } from '@/lib/inventory/near-expiry';
import { requireStaffSession } from '@/lib/auth/session';

export async function POST() {
  try {
    await requireStaffSession();
    const result = await suggestNearExpiryPromos();
    return NextResponse.json({
      success: true,
      ...result,
      message: result.suggested > 0 
        ? `Successfully generated ${result.suggested} near-expiry markdown recommendations` 
        : 'No near-expiry lots requiring markdown at this time',
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Failed to suggest promos' }, { status: e.status || 500 });
  }
}
