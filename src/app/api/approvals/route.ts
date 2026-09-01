import { NextResponse } from 'next/server';
import { createApproval, listApprovals, resolveApproval } from '@/lib/approvals/approval-store';
import { executeAgentApproval, isAgentApprovalToken } from '@/lib/agents/approval-execute';
import { defaultJarvisToolRegistry } from '@/lib/ai/jarvis-tools';
import { assertRole, getSession } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') assertRole(session, ['OWNER', 'ADMIN', 'MANAGER']);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | null;
    const approvals = await listApprovals(status || undefined);
    return NextResponse.json({ success: true, approvals });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: 'dev', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertRole(session, ['OWNER', 'ADMIN', 'MANAGER']);
    }
    const body = await req.json();

    if (body.action === 'approve' && body.id) {
      const resolved = await resolveApproval(body.id, 'APPROVED', session!.userId);
      if (!resolved) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      if (body.confirmationToken) {
        if (isAgentApprovalToken(body.confirmationToken)) {
          const execution = await executeAgentApproval(resolved, {
            actorId: session!.userId,
            actorRole: session!.role,
          });
          return NextResponse.json({ success: true, approval: resolved, execution });
        }
        const result = await defaultJarvisToolRegistry.confirmToolExecution(body.confirmationToken);
        return NextResponse.json({ success: true, approval: resolved, execution: result });
      }
      return NextResponse.json({ success: true, approval: resolved });
    }

    if (body.action === 'reject' && body.id) {
      const resolved = await resolveApproval(body.id, 'REJECTED', session!.userId);
      return NextResponse.json({ success: true, approval: resolved });
    }

    const approval = await createApproval({
      token: body.token,
      toolName: body.toolName,
      description: body.description,
      risk: body.risk,
      payload: body.payload || {},
      requestedBy: body.requestedBy || session!.userId,
      role: body.role || session!.role,
      expiresAt: body.expiresAt,
    });
    return NextResponse.json({ success: true, approval });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
