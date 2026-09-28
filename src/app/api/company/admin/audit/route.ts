import { NextResponse } from 'next/server';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { db, auditLogs } from '@/db';
import { assertRole, requireActiveStaffSession } from '@/lib/auth/session';
import { publicErrorResponse } from '@/lib/api/http-errors';

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;
const RISK_LEVELS = ['READ', 'DRAFT', 'LOW_RISK_WRITE', 'HIGH_RISK_WRITE', 'DESTRUCTIVE'] as const;

async function requireAuditAdmin() {
  const session = await requireActiveStaffSession();
  return assertRole(session, [...ALLOWED_ROLES]);
}

function serializeAudit(row: typeof auditLogs.$inferSelect) {
  return {
    id: row.id,
    actorId: row.actorId,
    actorRole: row.actorRole,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    riskLevel: row.riskLevel,
    beforeState: row.beforeState,
    afterState: row.afterState,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    await requireAuditAdmin();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const entity = searchParams.get('entity')?.trim();
    const rawRisk = searchParams.get('risk')?.trim().toUpperCase();
    const risk = rawRisk && RISK_LEVELS.includes(rawRisk as typeof RISK_LEVELS[number])
      ? rawRisk as typeof RISK_LEVELS[number]
      : undefined;
    const limitParam = Number(searchParams.get('limit') || 100);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 250) : 100;

    const filters = [
      entity && entity !== 'ALL' ? eq(auditLogs.entity, entity) : undefined,
      risk ? eq(auditLogs.riskLevel, risk) : undefined,
      q
        ? or(
            ilike(auditLogs.action, `%${q}%`),
            ilike(auditLogs.entity, `%${q}%`),
            ilike(auditLogs.entityId, `%${q}%`),
            ilike(auditLogs.actorRole, `%${q}%`),
          )
        : undefined,
    ].filter(Boolean);

    const rows = filters.length
      ? await db
          .select()
          .from(auditLogs)
          .where(and(...filters))
          .orderBy(desc(auditLogs.createdAt))
          .limit(limit)
      : await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);

    const stats = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.riskLevel] = (acc[row.riskLevel] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ success: true, auditLogs: rows.map(serializeAudit), stats });
  } catch (err) {
    return publicErrorResponse(err, {
      message: 'Unable to load audit logs',
      logMessage: 'Company audit trail load failed',
    });
  }
}
