import { NextResponse } from 'next/server';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, auditLogs, companyClients, companyLeads, companyOnboardingTasks } from '@/db';
import { assertRole, requireActiveStaffSession } from '@/lib/auth/session';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;
const CLIENT_STATUSES = ['PROSPECT', 'DEMO', 'WON', 'PROVISIONING', 'LIVE', 'ON_HOLD', 'LOST'] as const;
const PROVISIONING_STATUSES = ['NOT_STARTED', 'PLANNED', 'IN_PROGRESS', 'READY', 'BLOCKED'] as const;
const HANDOVER_STATUSES = ['NOT_READY', 'IN_PROGRESS', 'READY', 'HANDED_OVER'] as const;
const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED'] as const;

const defaultTasks = [
  { key: 'create_coolify_app', label: 'Create dedicated Coolify app', owner: 'Ops' },
  { key: 'create_database', label: 'Create fresh isolated Postgres DB', owner: 'Ops' },
  { key: 'set_env_vars', label: 'Set P0 environment variables', owner: 'Ops' },
  { key: 'run_bootstrap', label: 'Run npm run db:bootstrap', owner: 'Engineering' },
  { key: 'seed_business', label: 'Seed business profile and owner account', owner: 'Engineering' },
  { key: 'configure_vertical', label: 'Apply vertical preset and enabled modules', owner: 'Product' },
  { key: 'configure_branding', label: 'Upload logo and storefront branding', owner: 'Product' },
  { key: 'smoke_test', label: 'Smoke POS, stock, report, and checkout', owner: 'QA' },
  { key: 'handover', label: 'Handover credentials, SOP, and backup plan', owner: 'CEO' },
] as const;

const createSchema = z.object({
  leadId: z.string().uuid().optional().nullable(),
  businessName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  industry: z.string().trim().max(80).optional(),
  branchCount: z.coerce.number().int().min(1).max(250).optional(),
  status: z.enum(CLIENT_STATUSES).optional(),
  targetDomain: z.string().trim().max(180).optional().nullable(),
  coolifyAppName: z.string().trim().max(180).optional().nullable(),
  databaseName: z.string().trim().max(180).optional().nullable(),
  appStatus: z.enum(PROVISIONING_STATUSES).optional(),
  databaseStatus: z.enum(PROVISIONING_STATUSES).optional(),
  handoverStatus: z.enum(HANDOVER_STATUSES).optional(),
  verticalPreset: z.string().trim().max(80).optional(),
  layoutTemplate: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(2000).optional(),
  nextAction: z.string().trim().max(240).optional().nullable(),
  targetLaunchAt: z.string().datetime().optional().nullable(),
});

const updateSchema = createSchema.partial().extend({ id: z.string().uuid() });

const taskSchema = z.object({
  clientId: z.string().uuid(),
  taskKey: z.string().trim().min(2).max(80),
  status: z.enum(TASK_STATUSES),
  notes: z.string().trim().max(1000).optional(),
});

async function requireClientAdmin() {
  const session = await requireActiveStaffSession();
  return assertRole(session, [...ALLOWED_ROLES]);
}

function serializeClient(row: typeof companyClients.$inferSelect, tasks: Array<typeof companyOnboardingTasks.$inferSelect> = []) {
  return {
    id: row.id,
    leadId: row.leadId,
    businessName: row.businessName,
    ownerName: row.ownerName,
    phone: row.phone,
    email: row.email,
    industry: row.industry,
    branchCount: row.branchCount,
    status: row.status,
    targetDomain: row.targetDomain,
    coolifyAppName: row.coolifyAppName,
    databaseName: row.databaseName,
    appStatus: row.appStatus,
    databaseStatus: row.databaseStatus,
    handoverStatus: row.handoverStatus,
    verticalPreset: row.verticalPreset,
    layoutTemplate: row.layoutTemplate,
    notes: row.notes,
    nextAction: row.nextAction,
    targetLaunchAt: row.targetLaunchAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tasks: tasks.map(serializeTask),
  };
}

function serializeTask(row: typeof companyOnboardingTasks.$inferSelect) {
  return {
    id: row.id,
    clientId: row.clientId,
    taskKey: row.taskKey,
    label: row.label,
    status: row.status,
    owner: row.owner,
    notes: row.notes,
    completedAt: row.completedAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureDefaultTasks(clientId: string) {
  await db
    .insert(companyOnboardingTasks)
    .values(defaultTasks.map((task) => ({
      clientId,
      taskKey: task.key,
      label: task.label,
      owner: task.owner,
    })))
    .onConflictDoNothing();
}

async function tasksForClients(clientIds: string[]) {
  if (!clientIds.length) return new Map<string, Array<typeof companyOnboardingTasks.$inferSelect>>();
  const rows = await db.select().from(companyOnboardingTasks);
  const map = new Map<string, Array<typeof companyOnboardingTasks.$inferSelect>>();
  for (const row of rows) {
    if (!clientIds.includes(row.clientId)) continue;
    const existing = map.get(row.clientId) || [];
    existing.push(row);
    map.set(row.clientId, existing);
  }
  return map;
}

export async function GET(req: Request) {
  try {
    await requireClientAdmin();
    const { searchParams } = new URL(req.url);
    const rawStatus = searchParams.get('status')?.trim().toUpperCase();
    const status = rawStatus && rawStatus !== 'ALL' && CLIENT_STATUSES.includes(rawStatus as typeof CLIENT_STATUSES[number])
      ? rawStatus
      : undefined;
    const q = searchParams.get('q')?.trim();

    const filters = [
      status ? eq(companyClients.status, status) : undefined,
      q
        ? or(
            ilike(companyClients.businessName, `%${q}%`),
            ilike(companyClients.ownerName, `%${q}%`),
            ilike(companyClients.email, `%${q}%`),
            ilike(companyClients.targetDomain, `%${q}%`),
          )
        : undefined,
    ].filter(Boolean);

    const rows = filters.length
      ? await db.select().from(companyClients).where(and(...filters)).orderBy(desc(companyClients.createdAt)).limit(500)
      : await db.select().from(companyClients).orderBy(desc(companyClients.createdAt)).limit(500);

    const taskMap = await tasksForClients(rows.map((row) => row.id));
    return NextResponse.json({
      success: true,
      clients: rows.map((row) => serializeClient(row, taskMap.get(row.id) || [])),
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Unauthorized' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not load clients', logMessage: 'Company client register load failed' });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireClientAdmin();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid client');
    const body = parsed.data;

    const [client] = await db
      .insert(companyClients)
      .values({
        leadId: body.leadId || null,
        businessName: body.businessName,
        ownerName: body.ownerName,
        phone: body.phone || '',
        email: body.email?.toLowerCase() || '',
        industry: body.industry || 'General Retail',
        branchCount: body.branchCount || 1,
        status: body.status || 'WON',
        targetDomain: body.targetDomain || null,
        coolifyAppName: body.coolifyAppName || null,
        databaseName: body.databaseName || null,
        appStatus: body.appStatus || 'NOT_STARTED',
        databaseStatus: body.databaseStatus || 'NOT_STARTED',
        handoverStatus: body.handoverStatus || 'NOT_READY',
        verticalPreset: body.verticalPreset || 'general-retail',
        layoutTemplate: body.layoutTemplate || 'retail_wholesale',
        notes: body.notes || '',
        nextAction: body.nextAction || 'Create Coolify app and isolated database',
        targetLaunchAt: body.targetLaunchAt ? new Date(body.targetLaunchAt) : null,
      })
      .returning();

    await ensureDefaultTasks(client.id);
    if (body.leadId) {
      await db.update(companyLeads).set({ status: 'WON', updatedAt: new Date() }).where(eq(companyLeads.id, body.leadId));
    }
    const tasks = await db.select().from(companyOnboardingTasks).where(eq(companyOnboardingTasks.clientId, client.id));

    await db.insert(auditLogs).values({
      actorId: session.userId,
      action: 'COMPANY_CLIENT_CREATED',
      entity: 'company_client',
      entityId: client.id,
      afterState: serializeClient(client, tasks),
    });

    return NextResponse.json({ success: true, client: serializeClient(client, tasks) });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not create client', logMessage: 'Company client create failed' });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireClientAdmin();
    const raw = await req.json();
    if (raw?.taskKey) {
      const parsed = taskSchema.safeParse(raw);
      if (!parsed.success) return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid task update');
      const body = parsed.data;
      const [task] = await db
        .update(companyOnboardingTasks)
        .set({
          status: body.status,
          notes: body.notes,
          completedAt: body.status === 'DONE' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(and(eq(companyOnboardingTasks.clientId, body.clientId), eq(companyOnboardingTasks.taskKey, body.taskKey)))
        .returning();
      if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      return NextResponse.json({ success: true, task: serializeTask(task) });
    }

    const parsed = updateSchema.safeParse(raw);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid client update');
    const body = parsed.data;
    const [client] = await db
      .update(companyClients)
      .set({
        businessName: body.businessName,
        ownerName: body.ownerName,
        phone: body.phone,
        email: body.email?.toLowerCase(),
        industry: body.industry,
        branchCount: body.branchCount,
        status: body.status,
        targetDomain: body.targetDomain,
        coolifyAppName: body.coolifyAppName,
        databaseName: body.databaseName,
        appStatus: body.appStatus,
        databaseStatus: body.databaseStatus,
        handoverStatus: body.handoverStatus,
        verticalPreset: body.verticalPreset,
        layoutTemplate: body.layoutTemplate,
        notes: body.notes,
        nextAction: body.nextAction,
        targetLaunchAt: body.targetLaunchAt ? new Date(body.targetLaunchAt) : body.targetLaunchAt === null ? null : undefined,
        updatedAt: new Date(),
      })
      .where(eq(companyClients.id, body.id))
      .returning();

    if (!client) return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    await ensureDefaultTasks(client.id);
    const tasks = await db.select().from(companyOnboardingTasks).where(eq(companyOnboardingTasks.clientId, client.id));

    await db.insert(auditLogs).values({
      actorId: session.userId,
      action: 'COMPANY_CLIENT_UPDATED',
      entity: 'company_client',
      entityId: client.id,
      afterState: serializeClient(client, tasks),
    });

    return NextResponse.json({ success: true, client: serializeClient(client, tasks) });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not update client', logMessage: 'Company client update failed' });
  }
}
