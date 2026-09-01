import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';

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

export async function listApprovals(status?: ApprovalRequest['status']) {
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
  const cfg = await readConfigJson();
  const rows = (cfg.approvalQueue as ApprovalRequest[] | undefined) || [];
  const row: ApprovalRequest = {
    ...input,
    id: `appr_${Date.now()}`,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  await mergeConfigJson({ approvalQueue: [row, ...rows].slice(0, 100) });
  return row;
}

export async function resolveApproval(id: string, decision: 'APPROVED' | 'REJECTED', resolvedBy: string) {
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
  const rows = await listApprovals();
  return rows.find((r) => r.token === token && r.status === 'PENDING') || null;
}
