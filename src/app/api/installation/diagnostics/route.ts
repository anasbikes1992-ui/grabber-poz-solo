import { NextResponse } from 'next/server';
import { assertRole, getSession } from '@/lib/auth/session';
import { runInstallationDiagnostics } from '@/lib/installation';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      assertRole(session, ['OWNER', 'ADMIN', 'MANAGER']);
    }

    const report = await runInstallationDiagnostics();
    return NextResponse.json({ success: true, report });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
