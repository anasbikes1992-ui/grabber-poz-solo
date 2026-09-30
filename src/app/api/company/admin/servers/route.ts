import { NextResponse } from 'next/server';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, auditLogs, companyServers } from '@/db';
import { assertRole, requireActiveStaffSession } from '@/lib/auth/session';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';
import { evaluateServerCapacity, isMissingRelation, isUniqueViolation } from '@/lib/company/server-fleet';
import { deploymentCountsByServer, EMPTY_COUNTS, type DeploymentCounts } from '@/lib/company/server-fleet-db';

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;
const HEALTH_STATUSES = ['UNKNOWN', 'HEALTHY', 'DEGRADED', 'DOWN'] as const;
const RAM_PRESSURES = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'] as const;
const BACKUP_STATUSES = ['UNKNOWN', 'OK', 'STALE', 'FAILED', 'MISSING'] as const;

const emptyToNull = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? null : value);
const nullableText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());
const httpUrl = z.preprocess(
  emptyToNull,
  z.string().trim().max(220).url().refine((v) => /^https?:\/\//i.test(v), 'Coolify URL must start with http(s)://').nullable().optional(),
);

const serverSchema = z.object({
  name: z.string().trim().min(2).max(120),
  provider: z.string().trim().min(2).max(80).optional(),
  region: z.string().trim().max(120).optional(),
  publicIp: nullableText(80),
  hostname: nullableText(180),
  coolifyUrl: httpUrl,
  cpuCores: z.coerce.number().int().min(1).max(256).optional(),
  ramGb: z.coerce.number().int().min(1).max(2048).optional(),
  diskGb: z.coerce.number().int().min(10).max(100_000).optional(),
  maxClients: z.coerce.number().int().min(1).max(250).optional(),
  healthStatus: z.enum(HEALTH_STATUSES).optional(),
  diskUsagePercent: z.coerce.number().int().min(0).max(100).optional(),
  ramPressure: z.enum(RAM_PRESSURES).optional(),
  backupStatus: z.enum(BACKUP_STATUSES).optional(),
  notes: z.string().trim().max(2000).optional(),
  nextAction: nullableText(240),
  lastHeartbeatAt: z.string().datetime().optional().nullable(),
});

const updateSchema = serverSchema.partial().extend({ id: z.string().uuid() });

async function requireServerAdmin() {
  const session = await requireActiveStaffSession();
  return assertRole(session, [...ALLOWED_ROLES]);
}

function isMissingServerSchema(error: unknown) {
  return isMissingRelation(error);
}

function serverSetupResponse(status = 503) {
  return NextResponse.json({
    success: status < 500,
    setupRequired: true,
    error: 'Company server fleet tables are not ready',
    setupMessage: 'Run npm run db:bootstrap on the POZ database to apply migration 0032_company_server_fleet.sql.',
    servers: [],
  }, { status });
}

function serializeServer(row: typeof companyServers.$inferSelect, counts: DeploymentCounts = EMPTY_COUNTS) {
  const capacity = evaluateServerCapacity({
    assignedClients: counts.assignedClients,
    maxClients: row.maxClients,
    diskUsagePercent: row.diskUsagePercent,
    healthStatus: row.healthStatus,
    ramPressure: row.ramPressure,
  });

  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    region: row.region,
    publicIp: row.publicIp,
    hostname: row.hostname,
    coolifyUrl: row.coolifyUrl,
    cpuCores: row.cpuCores,
    ramGb: row.ramGb,
    diskGb: row.diskGb,
    maxClients: row.maxClients,
    assignedClients: counts.assignedClients,
    liveClients: counts.liveClients,
    unhealthyClients: counts.unhealthyClients,
    capacityStatus: capacity.status,
    capacityLabel: capacity.label,
    canAssignClient: capacity.canAssignClient,
    capacityNextAction: capacity.nextAction,
    healthStatus: row.healthStatus,
    diskUsagePercent: row.diskUsagePercent,
    ramPressure: row.ramPressure,
    backupStatus: row.backupStatus,
    notes: row.notes,
    nextAction: row.nextAction,
    lastHeartbeatAt: row.lastHeartbeatAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    await requireServerAdmin();
    const { searchParams } = new URL(req.url);
    const rawHealth = searchParams.get('healthStatus')?.trim().toUpperCase();
    const healthStatus = rawHealth && rawHealth !== 'ALL' && HEALTH_STATUSES.includes(rawHealth as typeof HEALTH_STATUSES[number])
      ? rawHealth
      : undefined;
    const q = searchParams.get('q')?.trim();

    const filters = [
      healthStatus ? eq(companyServers.healthStatus, healthStatus) : undefined,
      q
        ? or(
            ilike(companyServers.name, `%${q}%`),
            ilike(companyServers.provider, `%${q}%`),
            ilike(companyServers.region, `%${q}%`),
            ilike(companyServers.publicIp, `%${q}%`),
            ilike(companyServers.hostname, `%${q}%`),
          )
        : undefined,
    ].filter(Boolean);

    const rows = filters.length
      ? await db.select().from(companyServers).where(and(...filters)).orderBy(desc(companyServers.createdAt)).limit(500)
      : await db.select().from(companyServers).orderBy(desc(companyServers.createdAt)).limit(500);
    const counts = await deploymentCountsByServer();
    const servers = rows.map((row) => serializeServer(row, counts.get(row.id)));

    return NextResponse.json({
      success: true,
      servers,
      summary: {
        totalServers: servers.length,
        totalCapacity: servers.reduce((sum, server) => sum + server.maxClients, 0),
        assignedClients: servers.reduce((sum, server) => sum + server.assignedClients, 0),
        availableSlots: servers.reduce((sum, server) => sum + Math.max(0, server.maxClients - server.assignedClients), 0),
        assignableServers: servers.filter((server) => server.canAssignClient).length,
        blockedServers: servers.filter((server) => ['FULL', 'BLOCKED'].includes(server.capacityStatus)).length,
      },
    });
  } catch (err: unknown) {
    if (isMissingServerSchema(err)) return serverSetupResponse(200);
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Unauthorized' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not load servers', logMessage: 'Company server fleet load failed' });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireServerAdmin();
    const parsed = serverSchema.safeParse(await req.json());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid server');
    const body = parsed.data;

    const [server] = await db
      .insert(companyServers)
      .values({
        name: body.name,
        provider: body.provider || 'Contabo',
        region: body.region || 'Sri Lanka / APAC',
        publicIp: body.publicIp || null,
        hostname: body.hostname || null,
        coolifyUrl: body.coolifyUrl || null,
        cpuCores: body.cpuCores || 4,
        ramGb: body.ramGb || 8,
        diskGb: body.diskGb || 160,
        maxClients: body.maxClients || 5,
        healthStatus: body.healthStatus || 'UNKNOWN',
        diskUsagePercent: body.diskUsagePercent || 0,
        ramPressure: body.ramPressure || 'UNKNOWN',
        backupStatus: body.backupStatus || 'UNKNOWN',
        notes: body.notes || '',
        nextAction: body.nextAction || 'Create Coolify apps and private Postgres resources manually.',
        lastHeartbeatAt: body.lastHeartbeatAt ? new Date(body.lastHeartbeatAt) : null,
      })
      .returning();

    const serialized = serializeServer(server);
    await db.insert(auditLogs).values({
      actorId: session.userId,
      action: 'COMPANY_SERVER_CREATED',
      entity: 'company_server',
      entityId: server.id,
      afterState: serialized,
    });

    return NextResponse.json({ success: true, server: serialized });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) return NextResponse.json({ success: false, error: 'A server with this name already exists' }, { status: 409 });
    if (isMissingServerSchema(err)) return serverSetupResponse(503);
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not create server', logMessage: 'Company server create failed' });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireServerAdmin();
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid server update');
    const body = parsed.data;

    const [server] = await db
      .update(companyServers)
      .set({
        name: body.name,
        provider: body.provider,
        region: body.region,
        publicIp: body.publicIp,
        hostname: body.hostname,
        coolifyUrl: body.coolifyUrl,
        cpuCores: body.cpuCores,
        ramGb: body.ramGb,
        diskGb: body.diskGb,
        maxClients: body.maxClients,
        healthStatus: body.healthStatus,
        diskUsagePercent: body.diskUsagePercent,
        ramPressure: body.ramPressure,
        backupStatus: body.backupStatus,
        notes: body.notes,
        nextAction: body.nextAction,
        lastHeartbeatAt: body.lastHeartbeatAt ? new Date(body.lastHeartbeatAt) : body.lastHeartbeatAt === null ? null : undefined,
        updatedAt: new Date(),
      })
      .where(eq(companyServers.id, body.id))
      .returning();

    if (!server) return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    const counts = await deploymentCountsByServer();
    const serialized = serializeServer(server, counts.get(server.id));

    await db.insert(auditLogs).values({
      actorId: session.userId,
      action: 'COMPANY_SERVER_UPDATED',
      entity: 'company_server',
      entityId: server.id,
      afterState: serialized,
    });

    return NextResponse.json({ success: true, server: serialized });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) return NextResponse.json({ success: false, error: 'A server with this name already exists' }, { status: 409 });
    if (isMissingServerSchema(err)) return serverSetupResponse(503);
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not update server', logMessage: 'Company server update failed' });
  }
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function DELETE(req: Request) {
  try {
    const session = await requireServerAdmin();
    const fromQuery = new URL(req.url).searchParams.get('id');
    const parsed = deleteSchema.safeParse({ id: fromQuery ?? (await req.json().catch(() => ({}))).id });
    if (!parsed.success) return validationErrorResponse('Valid server id required');
    const { id } = parsed.data;

    const result = await db.transaction(async (tx) => {
      const [server] = await tx.select().from(companyServers).where(eq(companyServers.id, id)).for('update');
      if (!server) return { status: 404 as const };
      const counts = (await deploymentCountsByServer(tx)).get(id);
      if (counts && counts.assignedClients > 0) return { status: 409 as const, assigned: counts.assignedClients };
      await tx.delete(companyServers).where(eq(companyServers.id, id));
      await tx.insert(auditLogs).values({
        actorId: session.userId,
        action: 'COMPANY_SERVER_DELETED',
        entity: 'company_server',
        entityId: id,
        beforeState: serializeServer(server),
      });
      return { status: 200 as const };
    });

    if (result.status === 404) return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    if (result.status === 409) {
      return NextResponse.json({ success: false, error: `Reassign ${result.assigned} deployment(s) first` }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (isMissingServerSchema(err)) return serverSetupResponse(503);
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not delete server', logMessage: 'Company server delete failed' });
  }
}
