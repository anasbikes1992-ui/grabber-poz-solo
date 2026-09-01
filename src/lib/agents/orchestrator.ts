import { readConfigJson, mergeConfigJson } from '@/lib/config/business-settings';
import { DEFAULT_VERTICAL_FLAGS, type VerticalFlags } from '@/lib/config/vertical-flags';
import { proposeApprovalsFromAgentResult, type AgentApprovalDraft } from './approval-bridge';
import { executeAgent } from './handlers';
import { listEnabledAgentIds } from './registry';
import type { AgentId, AgentLogEntry, AgentResult, AgentTask } from './types';

export type AgentRunContext = {
  userId: string;
  role: string;
  proposeApprovals?: boolean;
};

export type AgentRunOutcome = AgentResult & {
  approvals?: AgentApprovalDraft[];
};

export type { AgentId, AgentResult, AgentTask, AgentLogEntry } from './types';
export { AGENT_REGISTRY, getAgentDefinition, listEnabledAgents } from './registry';
export { isAgentId, AGENT_IDS } from './types';

export async function readVerticalFlagsForAgents(): Promise<VerticalFlags> {
  try {
    const cfg = await readConfigJson();
    return { ...DEFAULT_VERTICAL_FLAGS, ...((cfg.verticalFlags as Partial<VerticalFlags>) || {}) };
  } catch {
    return DEFAULT_VERTICAL_FLAGS;
  }
}

async function appendAgentLog(entry: Omit<AgentLogEntry, 'id' | 'createdAt'>) {
  const cfg = await readConfigJson();
  const rows = (cfg.agentLogs as AgentLogEntry[] | undefined) || [];
  const row: AgentLogEntry = {
    ...entry,
    id: `agent_${Date.now()}_${entry.agent}`,
    createdAt: new Date().toISOString(),
  };
  await mergeConfigJson({ agentLogs: [row, ...rows].slice(0, 200) });
  return row;
}

export async function runAgentTaskDb(task: AgentTask, ctx?: AgentRunContext): Promise<AgentRunOutcome> {
  const flags = await readVerticalFlagsForAgents();
  const enabled = listEnabledAgentIds(flags);
  if (!enabled.includes(task.agent)) {
    return {
      agent: task.agent,
      summary: `${task.agent} agent is disabled for this store (vertical flag off).`,
      recommendations: ['Enable the module in Settings or vertical flags, then re-run.'],
    };
  }

  const result = await executeAgent(task.agent);
  await appendAgentLog({ agent: task.agent, summary: result.summary });

  if (ctx?.proposeApprovals !== false && ctx?.userId) {
    const approvals = await proposeApprovalsFromAgentResult(result, {
      userId: ctx.userId,
      role: ctx.role,
    });
    if (approvals.length) return { ...result, approvals };
  }

  return result;
}

export async function runAllEnabledAgents(ctx?: AgentRunContext): Promise<AgentRunOutcome[]> {
  const flags = await readVerticalFlagsForAgents();
  const ids = listEnabledAgentIds(flags);
  const results: AgentRunOutcome[] = [];

  for (const id of ids) {
    try {
      results.push(await runAgentTaskDb({ agent: id, prompt: 'Daily briefing' }, ctx));
    } catch (err) {
      results.push({
        agent: id,
        summary: `Agent failed: ${(err as Error).message}`,
        recommendations: ['Check database connection and vertical module data.'],
      });
    }
  }

  return results;
}

export async function runAgentTask(task: AgentTask, ctx?: AgentRunContext): Promise<AgentRunOutcome> {
  return runAgentTaskDb(task, ctx);
}

export async function listRecentAgentLogs(limit = 30): Promise<AgentLogEntry[]> {
  const cfg = await readConfigJson();
  const rows = (cfg.agentLogs as AgentLogEntry[] | undefined) || [];
  return rows.slice(0, limit);
}
