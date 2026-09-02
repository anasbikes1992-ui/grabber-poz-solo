import { createApproval } from '@/lib/approvals/approval-store';
import type { AgentId, AgentResult } from './types';

export type AgentApprovalDraft = {
  id: string;
  token: string;
  agent: AgentId;
  description: string;
};

/** Recommendation prefixes that warrant an Approval Center draft (AGT-04). */
const ACTIONABLE_PATTERNS: RegExp[] = [
  /^Draft PO line:/i,
  /^Collect EMI/i,
  /^Prepare settlement/i,
  /^Fire\/serve KOT/i,
  /^Ticket .+ — /i,
  /trigger REPAIR_READY WhatsApp/i,
  /^Approve\s+(?:a\s+)?creative campaign/i,
  /^Run WELCOME500/i,
];

export function isActionableRecommendation(text: string): boolean {
  return ACTIONABLE_PATTERNS.some((re) => re.test(text.trim()));
}

function parseCreativeProjectId(recommendation: string): string | null {
  const tagged = recommendation.match(/\[projectId=([0-9a-f-]{36})\]/i);
  if (tagged) return tagged[1];
  return null;
}

function buildAgentPayload(result: AgentResult, recommendation: string) {
  const payload: Record<string, unknown> = {
    agent: result.agent,
    recommendation,
    metrics: result.metrics ?? {},
    summary: result.summary,
  };

  const projectId = parseCreativeProjectId(recommendation);
  if (projectId) {
    payload.projectId = projectId;
    const titleMatch = recommendation.match(/"([^"]+)"/);
    if (titleMatch) {
      payload.heroTitle = titleMatch[1];
      payload.announcement = `New campaign live: ${titleMatch[1]}`;
    }
  }

  if (/Run WELCOME500/i.test(recommendation)) {
    payload.promoCode = 'WELCOME500';
  }

  return payload;
}

export async function proposeApprovalsFromAgentResult(
  result: AgentResult,
  context: { userId: string; role: string },
): Promise<AgentApprovalDraft[]> {
  const actionable = result.recommendations.filter(isActionableRecommendation);
  const drafts: AgentApprovalDraft[] = [];

  for (const recommendation of actionable.slice(0, 5)) {
    const token = `AGENT_${result.agent}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const row = await createApproval({
      token,
      toolName: `agent:${result.agent}`,
      description: recommendation,
      risk: 'DRAFT',
      payload: buildAgentPayload(result, recommendation),
      requestedBy: context.userId,
      role: context.role,
      expiresAt,
    });
    drafts.push({
      id: row.id,
      token: row.token,
      agent: result.agent,
      description: recommendation,
    });
  }

  return drafts;
}
