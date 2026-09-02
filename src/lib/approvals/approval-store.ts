import { desc, eq } from 'drizzle-orm';
import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';
import { db, approvals, hasDatabaseUrl } from '@/db';

export type ApprovalRequest = {
  id: string;
  token: string;
  toolName: string;
  description: string;
  risk: string;
  payload: Record<string, unknown>;
  requestedBy: string;
  role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
};

function rowFromDb(r: typeof approvals.$inferSelect): ApprovalRequest {
  return {
    id: r.id,
    token: r.token,
    toolName: r.toolName,
    description: r.description,
    risk: r.risk,
    payload: (r.payloadJson as Record<string, unknown>) || {},
    requestedBy: r.requestedBy,
    role: r.role,
    status: r.status as ApprovalRequest['status'],
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString(),
    resolvedBy: r.resolvedBy || undefined,
  };
}

async function readFromPostgres(status?: ApprovalRequest['status']): Promise<ApprovalRequest[] | null> {
  if (!hasDatabaseUrl()) return null;
  try {
    const rows = await db.select().from(approvals).orderBy(desc(approvals.createdAt));
    const now = Date.now();
    const normalized = rows.map((r) => {
      const mapped = rowFromDb(r);
      return mapped.status === 'PENDING' && new Date(mapped.expiresAt).getTime() < now
        ? { ...mapped, status: 'EXPIRED' as const }
        : mapped;
    });
    if (status) return normalized.filter((r) => r.status === status);
    return normalized;
  } catch {
    return null;
  }
}

export async function listApprovals(status?: ApprovalRequest['status']) {
  const pgRows = await readFromPostgres(status);
  if (pgRows) return pgRows;

  const cfg = await readConfigJson();
  const rows = (cfg.approvalQueue as ApprovalRequest[] | undefined) || [];
  const now = Date.now();
  const normalized = rows.map((r) =>
    r.status === 'PENDING' && new Date(r.expiresAt).getTime() < now ? { ...r, status: 'EXPIRED' as const } : r,
  );
  if (status) return normalized.filter((r) => r.status === status);
  return normalized;
}

export async function createApproval(input: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status'>) {
  const row: ApprovalRequest = {
    ...input,
    id: `appr_${Date.now()}`,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  if (hasDatabaseUrl()) {
    try {
      const [inserted] = await db
        .insert(approvals)
        .values({
          token: row.token,
          toolName: row.toolName,
          description: row.description,
          risk: row.risk,
          payloadJson: row.payload,
          requestedBy: row.requestedBy,
          role: row.role,
          status: 'PENDING',
          expiresAt: new Date(row.expiresAt),
        })
        .returning();
      if (inserted) return rowFromDb(inserted);
    } catch {
      // fall through to JSON store
    }
  }

  const cfg = await readConfigJson();
  const rows = (cfg.approvalQueue as ApprovalRequest[] | undefined) || [];
  await mergeConfigJson({ approvalQueue: [row, ...rows].slice(0, 100) });
  return row;
}

export async function resolveApproval(id: string, decision: 'APPROVED' | 'REJECTED', resolvedBy: string) {
  if (hasDatabaseUrl()) {
    try {
      const [updated] = await db
        .update(approvals)
        .set({
          status: decision,
          resolvedAt: new Date(),
          resolvedBy,
        })
        .where(eq(approvals.id, id))
        .returning();
      if (updated) return rowFromDb(updated);
    } catch {
      // fall through
    }
  }

  const cfg = await readConfigJson();
  const rows = (cfg.approvalQueue as ApprovalRequest[] | undefined) || [];
  let resolved: ApprovalRequest | null = null;
  const next = rows.map((r) => {
    if (r.id !== id) return r;
    resolved = {
      ...r,
      status: decision,
      resolvedAt: new Date().toISOString(),
      resolvedBy,
    };
    return resolved;
  });
  await mergeConfigJson({ approvalQueue: next });
  return resolved;
}

export async function findApprovalByToken(token: string) {
  if (hasDatabaseUrl()) {
    try {
      const [row] = await db.select().from(approvals).where(eq(approvals.token, token)).limit(1);
      if (row && row.status === 'PENDING') {
        const mapped = rowFromDb(row);
        if (new Date(mapped.expiresAt).getTime() < Date.now()) return null;
        return mapped;
      }
    } catch {
      // fall through
    }
  }

  const rows = await listApprovals();
  return rows.find((r) => r.token === token && r.status === 'PENDING') || null;
}
