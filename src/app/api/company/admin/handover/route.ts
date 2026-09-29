import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, companyClients, companyDeployments, companyOnboardingTasks } from '@/db';
import { assertRole, requireActiveStaffSession } from '@/lib/auth/session';
import { publicErrorResponse } from '@/lib/api/http-errors';
import {
  evaluateHandoverReadiness,
  findBestDeployment,
  summarizeHandover,
  type HandoverTaskInput,
} from '@/lib/company/handover-readiness';

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;

async function requireHandoverAdmin() {
  const session = await requireActiveStaffSession();
  return assertRole(session, [...ALLOWED_ROLES]);
}

function isMissingHandoverSchema(error: unknown) {
  const err = error as { code?: string; message?: string };
  const message = String(err.message || '').toLowerCase();
  return (
    err.code === '42P01' ||
    message.includes('company_clients') ||
    message.includes('company_onboarding_tasks') ||
    message.includes('company_deployments')
  );
}

function setupResponse(status = 200) {
  return NextResponse.json({
    success: status < 500,
    setupRequired: true,
    setupMessage: 'Run npm run db:bootstrap on the POZ database so client, onboarding, and deployment registers are aligned.',
    summary: { total: 0, ready: 0, needsReview: 0, blocked: 0 },
    handovers: [],
  }, { status });
}

export async function GET(req: Request) {
  try {
    await requireHandoverAdmin();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId')?.trim();

    const clients = clientId
      ? await db.select().from(companyClients).where(eq(companyClients.id, clientId)).limit(1)
      : await db.select().from(companyClients).orderBy(desc(companyClients.updatedAt)).limit(500);

    const [tasks, deployments] = await Promise.all([
      db.select().from(companyOnboardingTasks),
      db.select().from(companyDeployments).orderBy(desc(companyDeployments.updatedAt)).limit(500),
    ]);

    const handovers = clients.map((client) => {
      const clientTasks = tasks.filter((task) => task.clientId === client.id) satisfies HandoverTaskInput[];
      const deployment = findBestDeployment(client, deployments);
      return evaluateHandoverReadiness(client, clientTasks, deployment);
    });

    const summary = summarizeHandover(handovers);
    return NextResponse.json({ success: true, summary, handovers });
  } catch (err: unknown) {
    if (isMissingHandoverSchema(err)) return setupResponse(200);
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Unauthorized' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not load handover readiness', logMessage: 'Company handover readiness load failed' });
  }
}
