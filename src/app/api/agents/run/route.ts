import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  AGENT_REGISTRY,
  isAgentId,
  listEnabledAgents,
  readVerticalFlagsForAgents,
  runAgentTask,
  runAllEnabledAgents,
} from '@/lib/agents/orchestrator';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const runAll = body.all === true || body.action === 'run_all';

    if (runAll) {
      const results = await runAllEnabledAgents();
      return NextResponse.json({ success: true, results, count: results.length });
    }

    const agentRaw = String(body.agent || 'SALES');
    if (!isAgentId(agentRaw)) {
      return NextResponse.json({ success: false, error: `Unknown agent: ${agentRaw}` }, { status: 400 });
    }

    const result = await runAgentTask({ agent: agentRaw, prompt: body.prompt || '' });
    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const flags = await readVerticalFlagsForAgents();
    const enabled = listEnabledAgents(flags);
    return NextResponse.json({
      success: true,
      registry: AGENT_REGISTRY,
      enabled: enabled.map((a) => a.id),
      flags,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
