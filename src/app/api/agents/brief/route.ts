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
    const results = await runAllEnabledAgents();
    const logs = await listRecentAgentLogs(20);

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      enabledAgents: enabled.map((a) => a.id),
      results,
      recentLogs: logs,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
