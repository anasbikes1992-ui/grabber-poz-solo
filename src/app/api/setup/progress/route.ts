import { NextResponse } from 'next/server';
import { getOnboardingProgress } from '@/lib/setup/onboarding-milestones';
import { requireStaffSession } from '@/lib/auth/session';

export async function GET() {
  try {
    await requireStaffSession();
    const progress = await getOnboardingProgress();
    return NextResponse.json({ success: true, ...progress });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
