import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { CockpitAggregator } from '@/lib/jarvis/cockpit';
import { requireStaffSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    await requireStaffSession();
    const brief = await CockpitAggregator.generateMorningBrief();
    return NextResponse.json({
      success: true,
      cockpit: brief,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: (err as { status?: number }).status || 500 }
    );
  }
}
