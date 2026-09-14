import { NextResponse } from 'next/server';
import { completeOnboarding, getOnboardingProgress } from '@/lib/setup/onboarding-milestones';
import { assertRole, requireStaffSession } from '@/lib/auth/session';

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

export async function POST() {
  try {
    const session = await requireStaffSession();
    assertRole(session, ['OWNER', 'ADMIN']);
    const progress = await completeOnboarding();
    return NextResponse.json({ success: true, ...progress });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
