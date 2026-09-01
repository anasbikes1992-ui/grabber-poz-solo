import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { runAgentTask } from '@/lib/agents/orchestrator';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const agent = (body.agent || 'SALES') as 'SALES' | 'INVENTORY' | 'MARKETING';
    const result = await runAgentTask({ agent, prompt: body.prompt || '' });
    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
