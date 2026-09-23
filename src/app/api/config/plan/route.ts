import { NextResponse } from 'next/server';
import { getGrabberPlanMode, setGrabberPlanMode, getPlanFeatures, type GrabberPlanMode } from '@/lib/config/plan-mode';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mode = await getGrabberPlanMode();
    const features = getPlanFeatures(mode);
    return NextResponse.json({
      success: true,
      mode,
      features,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    // Allow toggle by authenticated staff (or fallback in dev/local setup)
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const nextMode: GrabberPlanMode = body.mode === 'basic' ? 'basic' : 'pro';

    await setGrabberPlanMode(nextMode);
    const features = getPlanFeatures(nextMode);

    return NextResponse.json({
      success: true,
      mode: nextMode,
      features,
      message: `Plan mode updated to ${nextMode.toUpperCase()}`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
