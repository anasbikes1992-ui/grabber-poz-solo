import { NextResponse } from 'next/server';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, auditLogs, companyDeployments } from '@/db';
import { assertRole, requireActiveStaffSession } from '@/lib/auth/session';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';
import { isMissingRelation } from '@/lib/company/server-fleet';
import { assertServerAssignable } from '@/lib/company/server-fleet-db';

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;
const WORK_STATUSES = ['NOT_STARTED', 'PLANNED', 'IN_PROGRESS', 'READY', 'BLOCKED'] as const;
const DEPLOY_STATUSES = ['NOT_STARTED', 'QUEUED', 'BUILDING', 'DEPLOYING', 'LIVE', 'FAILED', 'ROLLED_BACK'] as const;
const HEALTH_STATUSES = ['UNKNOWN', 'HEALTHY', 'DEGRADED', 'DOWN'] as const;

const deploymentSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  serverId: z.string().uuid().optional().nullable(),
  businessName: z.string().trim().min(2).max(120),
  appName: z.string().trim().min(2).max(180),
  environment: z.string().trim().min(2).max(80).optional(),
  domain: z.string().trim().max(180).optional().nullable(),
  databaseName: z.string().trim().max(180).optional().nullable(),
  coolifyProjectId: z.string().trim().max(180).optional().nullable(),
  coolifyServiceId: z.string().trim().max(180).optional().nullable(),
  repository: z.string().trim().max(220).optional(),
  branch: z.string().trim().max(120).optional(),
  commitSha: z.string().trim().max(80).optional().nullable(),
  appStatus: z.enum(WORK_STATUSES).optional(),
  databaseStatus: z.enum(WORK_STATUSES).optional(),
  deployStatus: z.enum(DEPLOY_STATUSES).optional(),
  healthStatus: z.enum(HEALTH_STATUSES).optional(),
  backupStatus: z.enum(['UNKNOWN', 'OK', 'STALE', 'FAILED', 'MISSING']).optional(),
  notes: z.string().trim().max(2000).optional(),
  nextAction: z.string().trim().max(240).optional().nullable(),
  lastDeployedAt: z.string().datetime().optional().nullable(),
  lastCheckedAt: z.string().datetime().optional().nullable(),
  lastBackupAt: z.string().datetime().optional().nullable(),
  lastHeartbeatAt: z.string().datetime().optional().nullable(),
});

const updateSchema = deploymentSchema.partial().extend({ id: z.string().uuid() });

async function requireDeploymentAdmin() {
  const session = await requireActiveStaffSession();
  return assertRole(session, [...ALLOWED_ROLES]);
}

function isMissingDeploymentSchema(error: unknown) {
  return isMissingRelation(error);
}

function deploymentSetupResponse(status = 503) {
  return NextResponse.json({
    success: status < 500,
    setupRequired: true,
    error: 'Company deployment register table is not ready',
    setupMessage: 'Run npm run db:bootstrap on the POZ database to apply migration 0024_company_deployments.sql.',
    deployments: [],
  }, { status });
}

function serializeDeployment(row: typeof companyDeployments.$inferSelect) {
  return {
    id: row.id,
    clientId: row.clientId,
    serverId: row.serverId,
    businessName: row.businessName,
    appName: row.appName,
    environment: row.environment,
    domain: row.domain,
    databaseName: row.databaseName,
    coolifyProjectId: row.coolifyProjectId,
    coolifyServiceId: row.coolifyServiceId,
    repository: row.repository,
    branch: row.branch,
    commitSha: row.commitSha,
    appStatus: row.appStatus,
    databaseStatus: row.databaseStatus,
    deployStatus: row.deployStatus,
    healthStatus: row.healthStatus,
    backupStatus: row.backupStatus,
    notes: row.notes,
    nextAction: row.nextAction,
    lastDeployedAt: row.lastDeployedAt?.toISOString() || null,
    lastCheckedAt: row.lastCheckedAt?.toISOString() || null,
    lastBackupAt: row.lastBackupAt?.toISOString() || null,
    lastHeartbeatAt: row.lastHeartbeatAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    await requireDeploymentAdmin();
    const { searchParams } = new URL(req.url);
    const rawStatus = searchParams.get('deployStatus')?.trim().toUpperCase();
    const deployStatus = rawStatus && rawStatus !== 'ALL' && DEPLOY_STATUSES.includes(rawStatus as typeof DEPLOY_STATUSES[number])
      ? rawStatus
      : undefined;
    const q = searchParams.get('q')?.trim();

    const filters = [
      deployStatus ? eq(companyDeployments.deployStatus, deployStatus) : undefined,
      q
        ? or(
            ilike(companyDeployments.businessName, `%${q}%`),
            ilike(companyDeployments.appName, `%${q}%`),
            ilike(companyDeployments.domain, `%${q}%`),
            ilike(companyDeployments.databaseName, `%${q}%`),
            ilike(companyDeployments.commitSha, `%${q}%`),
          )
        : undefined,
    ].filter(Boolean);

    const rows = filters.length
      ? await db
          .select()
          .from(companyDeployments)
          .where(and(...filters))
          .orderBy(desc(companyDeployments.createdAt))
          .limit(500)
      : await db.select().from(companyDeployments).orderBy(desc(companyDeployments.createdAt)).limit(500);

    return NextResponse.json({ success: true, deployments: rows.map(serializeDeployment) });
  } catch (err: unknown) {
    if (isMissingDeploymentSchema(err)) return deploymentSetupResponse(200);
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Unauthorized' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not load deployments', logMessage: 'Company deployments load failed' });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireDeploymentAdmin();
    const parsed = deploymentSchema.safeParse(await req.json());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid deployment');
    const body = parsed.data;

    const [deployment] = await db.transaction(async (tx) => {
      if (body.serverId) await assertServerAssignable(tx, body.serverId);
      return tx
      .insert(companyDeployments)
      .values({
        clientId: body.clientId || null,
        serverId: body.serverId || null,
        businessName: body.businessName,
        appName: body.appName,
        environment: body.environment || 'production',
        domain: body.domain || null,
        databaseName: body.databaseName || null,
        coolifyProjectId: body.coolifyProjectId || null,
        coolifyServiceId: body.coolifyServiceId || null,
        repository: body.repository || 'anasbikes1992-ui/grabber-poz-solo',
        branch: body.branch || 'main',
        commitSha: body.commitSha || null,
        appStatus: body.appStatus || 'NOT_STARTED',
        databaseStatus: body.databaseStatus || 'NOT_STARTED',
        deployStatus: body.deployStatus || 'NOT_STARTED',
        healthStatus: body.healthStatus || 'UNKNOWN',
        backupStatus: body.backupStatus || 'UNKNOWN',
        notes: body.notes || '',
        nextAction: body.nextAction || 'Create app, database, env vars, and bootstrap',
        lastDeployedAt: body.lastDeployedAt ? new Date(body.lastDeployedAt) : null,
        lastCheckedAt: body.lastCheckedAt ? new Date(body.lastCheckedAt) : null,
        lastBackupAt: body.lastBackupAt ? new Date(body.lastBackupAt) : null,
        lastHeartbeatAt: body.lastHeartbeatAt ? new Date(body.lastHeartbeatAt) : null,
      })
      .returning();
    });

    await db.insert(auditLogs).values({
      actorId: session.userId,
      action: 'COMPANY_DEPLOYMENT_CREATED',
      entity: 'company_deployment',
      entityId: deployment.id,
      afterState: serializeDeployment(deployment),
    });

    return NextResponse.json({ success: true, deployment: serializeDeployment(deployment) });
  } catch (err: unknown) {
    if (isMissingDeploymentSchema(err)) return deploymentSetupResponse(503);
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not create deployment', logMessage: 'Company deployment create failed' });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireDeploymentAdmin();
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid deployment update');
    const body = parsed.data;

    const [deployment] = await db.transaction(async (tx) => {
      if (body.serverId) {
        const [current] = await tx
          .select({ serverId: companyDeployments.serverId })
          .from(companyDeployments)
          .where(eq(companyDeployments.id, body.id))
          .limit(1);
        if (current && current.serverId !== body.serverId) await assertServerAssignable(tx, body.serverId);
      }
      return tx
      .update(companyDeployments)
      .set({
        clientId: body.clientId,
        serverId: body.serverId,
        businessName: body.businessName,
        appName: body.appName,
        environment: body.environment,
        domain: body.domain,
        databaseName: body.databaseName,
        coolifyProjectId: body.coolifyProjectId,
        coolifyServiceId: body.coolifyServiceId,
        repository: body.repository,
        branch: body.branch,
        commitSha: body.commitSha,
        appStatus: body.appStatus,
        databaseStatus: body.databaseStatus,
        deployStatus: body.deployStatus,
        healthStatus: body.healthStatus,
        backupStatus: body.backupStatus,
        notes: body.notes,
        nextAction: body.nextAction,
        lastDeployedAt: body.lastDeployedAt ? new Date(body.lastDeployedAt) : body.lastDeployedAt === null ? null : undefined,
        lastCheckedAt: body.lastCheckedAt ? new Date(body.lastCheckedAt) : body.lastCheckedAt === null ? null : undefined,
        lastBackupAt: body.lastBackupAt ? new Date(body.lastBackupAt) : body.lastBackupAt === null ? null : undefined,
        lastHeartbeatAt: body.lastHeartbeatAt ? new Date(body.lastHeartbeatAt) : body.lastHeartbeatAt === null ? null : undefined,
        updatedAt: new Date(),
      })
      .where(eq(companyDeployments.id, body.id))
      .returning();
    });

    if (!deployment) return NextResponse.json({ success: false, error: 'Deployment not found' }, { status: 404 });

    await db.insert(auditLogs).values({
      actorId: session.userId,
      action: 'COMPANY_DEPLOYMENT_UPDATED',
      entity: 'company_deployment',
      entityId: deployment.id,
      afterState: serializeDeployment(deployment),
    });

    return NextResponse.json({ success: true, deployment: serializeDeployment(deployment) });
  } catch (err: unknown) {
    if (isMissingDeploymentSchema(err)) return deploymentSetupResponse(503);
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not update deployment', logMessage: 'Company deployment update failed' });
  }
}
