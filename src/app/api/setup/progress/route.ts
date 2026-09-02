import { NextResponse } from 'next/server';
import { getOnboardingProgress } from '@/lib/setup/onboarding-milestones';

export async function GET() {
  try {
    const progress = await getOnboardingProgress();
    return NextResponse.json({ success: true, ...progress });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
