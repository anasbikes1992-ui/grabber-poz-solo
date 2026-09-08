import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AutonomyPolicyEngine, type ActionCategory, type AutonomyMode } from '@/lib/jarvis/autonomy-policy';
import { readConfigJson, mergeConfigJson } from '@/lib/config/business-settings';
import { requireStaffSession, assertRole } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    await requireStaffSession();

    const cfg = await readConfigJson();
    const customPolicies = (cfg.autonomyPolicies as any) || {};
    const engine = new AutonomyPolicyEngine(customPolicies);

    return NextResponse.json({
      success: true,
      policies: engine.getAllPolicies(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: (err as { status?: number }).status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffSession();
    assertRole(session, ['OWNER', 'ADMIN']);

    const body = await req.json();
    const { category, mode, maxTransactionValue, maxDailyFrequency, cooldownHours } = body as {
      category: ActionCategory;
      mode: AutonomyMode;
      maxTransactionValue?: number;
      maxDailyFrequency?: number;
      cooldownHours?: number;
    };

    if (!category) {
      return NextResponse.json({ success: false, error: 'Missing category' }, { status: 400 });
    }

    const cfg = await readConfigJson();
    const customPolicies = (cfg.autonomyPolicies as any) || {};
    const engine = new AutonomyPolicyEngine(customPolicies);

    const updated = engine.updatePolicy(category, {
      currentMode: mode,
      maxTransactionValue,
      maxDailyFrequency,
      cooldownHours,
    });

    customPolicies[category] = updated;
    await mergeConfigJson({ autonomyPolicies: customPolicies });

    return NextResponse.json({
      success: true,
      updatedPolicy: updated,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: (err as { status?: number }).status || 500 }
    );
  }
}
