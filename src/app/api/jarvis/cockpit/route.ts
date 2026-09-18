import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { CockpitAggregator } from '@/lib/jarvis/cockpit';
import { defaultJarvisBrain } from '@/lib/jarvis/brain';
import { requireStaffSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    await requireStaffSession();
    const [brief, actionHistory] = await Promise.all([
      defaultJarvisBrain.runFullObservationCycle(),
      defaultJarvisBrain.listActionHistory(20),
    ]);
    return NextResponse.json({
      success: true,
      cockpit: brief,
      brain: {
        recentActions: actionHistory,
        policyModes: defaultJarvisBrain.getPolicyEngine() ? true : false,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: (err as { status?: number }).status || 500 },
    );
  }
}
