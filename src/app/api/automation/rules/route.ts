import { NextResponse } from 'next/server';
import { assertRole, getSession } from '@/lib/auth/session';
import { listAutomationRules, saveAutomationRules, listAutomationLogs } from '@/lib/automation/rules-store';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      assertRole(session, ['OWNER', 'ADMIN', 'MANAGER']);
    }
    const { searchParams } = new URL(req.url);
    if (searchParams.get('view') === 'logs') {
      const logs = await listAutomationLogs();
      return NextResponse.json({ success: true, logs });
    }
    const rules = await listAutomationRules();
    return NextResponse.json({ success: true, rules });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: 'dev', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertRole(session, ['OWNER', 'ADMIN']);
    }
    const body = await req.json();
    const rules = await saveAutomationRules(body.rules || []);
    return NextResponse.json({ success: true, rules });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
