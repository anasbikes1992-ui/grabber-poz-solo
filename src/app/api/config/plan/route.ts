import { NextResponse } from 'next/server';
import {
  getEnabledVerticalPacks,
  getGrabberPlanMode,
  getPlanFeatures,
  setEnabledVerticalPacks,
  setGrabberPlanMode,
  type GrabberVerticalPack,
} from '@/lib/config/plan-mode';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mode = await getGrabberPlanMode();
    const features = getPlanFeatures(mode);
    const verticalPacks = await getEnabledVerticalPacks();
    return NextResponse.json({
      success: true,
      mode,
      edition: 'Grabber Business OS Pro',
      commercialModel: 'one_pro_plan',
      verticalPacks,
      features,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

async function updatePlan(req: Request) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const requestedPacks = Array.isArray(body.verticalPacks)
      ? (body.verticalPacks as GrabberVerticalPack[])
      : undefined;

    await setGrabberPlanMode('pro');
    if (requestedPacks) {
      await setEnabledVerticalPacks(requestedPacks);
    }
    const verticalPacks = await getEnabledVerticalPacks();
    const features = getPlanFeatures('pro');

    return NextResponse.json({
      success: true,
      mode: 'pro',
      edition: 'Grabber Business OS Pro',
      commercialModel: 'one_pro_plan',
      verticalPacks,
      features,
      message: 'Grabber Business OS Pro is active for this client.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return updatePlan(req);
}

export async function PUT(req: Request) {
  return updatePlan(req);
}
