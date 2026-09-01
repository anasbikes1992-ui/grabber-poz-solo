import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  listEnabledAgents,
  listRecentAgentLogs,
  readVerticalFlagsForAgents,
  runAllEnabledAgents,
} from '@/lib/agents/orchestrator';

/** Combined daily brief — all enabled vertical + core agents. */
export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const flags = await readVerticalFlagsForAgents();
    const enabled = listEnabledAgents(flags);
    const ctx = session
      ? { userId: session.userId, role: session.role, proposeApprovals: true }
      : process.env.NODE_ENV !== 'production'
        ? { userId: '00000000-0000-0000-0000-000000000001', role: 'OWNER' as const, proposeApprovals: true }
        : undefined;
    const results = await runAllEnabledAgents(ctx);
    const logs = await listRecentAgentLogs(20);
    const approvalCount = results.reduce((n, r) => n + (r.approvals?.length || 0), 0);

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      enabledAgents: enabled.map((a) => a.id),
      results,
      recentLogs: logs,
      approvalCount,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
