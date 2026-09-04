import { describe, it, expect, vi } from 'vitest';
import {
  preflightAndExecuteAgentAction,
} from '@/lib/agents/preflight';
import {
  AGENT_TOOL_REGISTRY,
  AgentSecurityError,
  type AgentAction,
} from '@/lib/agents/control-plane';

vi.mock('@/lib/approvals/approval-store', () => ({
  createApproval: vi.fn().mockImplementation(async (params: any) => ({
    id: 'appr-mock-id-01',
    token: params.token || 'TOKEN_MOCK',
    toolName: params.toolName,
    description: params.description,
    risk: params.risk,
    payload: params.payload,
    requestedBy: params.requestedBy,
    role: params.role,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    expiresAt: params.expiresAt,
  })),
}));

vi.mock('@/db', () => ({
  db: {
    insert: () => ({
      values: () => Promise.resolve(),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }),
    transaction: async (cb: any) => cb({}),
  },
  auditLogs: {},
  stockBalances: {},
  products: {},
  orders: {},
}));

describe('Agent Security & Control Plane (AG-001 through AG-012)', () => {
  describe('AG-004: Absolute Prohibition of Arbitrary SQL', () => {
    it('rejects arbitrary_sql tool call with AgentSecurityError', async () => {
      const action: AgentAction = {
        actionId: 'act-sql-01',
        agentId: 'jarvis',
        actorType: 'AI_AGENT',
        requestedBy: 'user-1',
        role: 'OWNER',
        tool: 'arbitrary_sql',
        input: { sql: 'SELECT * FROM users' },
        riskLevel: 'IRREVERSIBLE',
        autonomyLevel: 'L5_FORBIDDEN',
        approvalRequired: true,
        executionStatus: 'PLANNED',
        correlationId: 'corr-01',
        createdAt: new Date().toISOString(),
      };

      await expect(
        preflightAndExecuteAgentAction(action, { actorId: 'user-1', role: 'OWNER' }),
      ).rejects.toThrow(AgentSecurityError);
    });

    it('detects and blocks prompt-injected raw SQL keywords in tool queries', async () => {
      const action: AgentAction = {
        actionId: 'act-sql-inject-02',
        agentId: 'jarvis',
        actorType: 'AI_AGENT',
        requestedBy: 'user-1',
        role: 'OWNER',
        tool: 'search_products',
        input: { query: 'test; DROP TABLE users; --' },
        riskLevel: 'READ',
        autonomyLevel: 'L0_OBSERVE',
        approvalRequired: false,
        executionStatus: 'PLANNED',
        correlationId: 'corr-02',
        createdAt: new Date().toISOString(),
      };

      await expect(
        preflightAndExecuteAgentAction(action, { actorId: 'user-1', role: 'OWNER' }),
      ).rejects.toThrow(/AG-004: Arbitrary SQL execution is strictly forbidden/i);
    });
  });

  describe('AG-001: Explicit Tool Schemas & Unregistered Tool Rejection', () => {
    it('rejects unregistered tool invocations', async () => {
      const action: AgentAction = {
        actionId: 'act-unreg-01',
        agentId: 'jarvis',
        actorType: 'AI_AGENT',
        requestedBy: 'user-1',
        role: 'OWNER',
        tool: 'hack_the_planet',
        input: {},
        riskLevel: 'READ',
        autonomyLevel: 'L0_OBSERVE',
        approvalRequired: false,
        executionStatus: 'PLANNED',
        correlationId: 'corr-03',
        createdAt: new Date().toISOString(),
      };

      await expect(
        preflightAndExecuteAgentAction(action, { actorId: 'user-1', role: 'OWNER' }),
      ).rejects.toThrow(/AG-001: Unregistered agent tool/i);
    });

    it('fails preflight when required parameters are missing', async () => {
      const action: AgentAction = {
        actionId: 'act-schema-02',
        agentId: 'jarvis',
        actorType: 'AI_AGENT',
        requestedBy: 'user-1',
        role: 'OWNER',
        tool: 'get_inventory_balance',
        input: {}, // missing required productId
        riskLevel: 'READ',
        autonomyLevel: 'L0_OBSERVE',
        approvalRequired: false,
        executionStatus: 'PLANNED',
        correlationId: 'corr-04',
        createdAt: new Date().toISOString(),
      };

      const res = await preflightAndExecuteAgentAction(action, { actorId: 'user-1', role: 'OWNER' });
      expect(res.executionStatus).toBe('PREFLIGHT_FAILED');
      expect(res.error).toContain("Missing required parameter: 'productId'");
    });
  });

  describe('AG-002 & AG-010: Privilege Escalation Immunity', () => {
    it('blocks CASHIER role from executing OWNER-only adjust_stock tool', async () => {
      const action: AgentAction = {
        actionId: 'act-priv-01',
        agentId: 'jarvis',
        actorType: 'AI_AGENT',
        requestedBy: 'cashier-1',
        role: 'CASHIER',
        tool: 'adjust_stock',
        input: { productId: 'p1', locationId: 'loc1', delta: 50, reason: 'Test adjustment' },
        riskLevel: 'HIGH_RISK_WRITE',
        autonomyLevel: 'L3_APPROVAL',
        approvalRequired: true,
        executionStatus: 'PLANNED',
        correlationId: 'corr-05',
        createdAt: new Date().toISOString(),
      };

      await expect(
        preflightAndExecuteAgentAction(action, { actorId: 'cashier-1', role: 'CASHIER' }),
      ).rejects.toThrow(/AG-010: Privilege Escalation Blocked/i);
    });
  });

  describe('AG-003: Approval Bridge for High-Risk Writes', () => {
    it('routes unapproved HIGH_RISK_WRITE tool calls to APPROVAL_WAITING', async () => {
      const action: AgentAction = {
        actionId: `act-appr-${Date.now()}`,
        agentId: 'jarvis',
        actorType: 'AI_AGENT',
        requestedBy: 'owner-1',
        role: 'OWNER',
        tool: 'adjust_stock',
        input: { productId: 'p100', locationId: 'loc-wh', delta: -5, reason: 'Damaged item write-off' },
        riskLevel: 'HIGH_RISK_WRITE',
        autonomyLevel: 'L3_APPROVAL',
        approvalRequired: true,
        executionStatus: 'PLANNED',
        correlationId: 'corr-06',
        createdAt: new Date().toISOString(),
      };

      const res = await preflightAndExecuteAgentAction(action, { actorId: 'owner-1', role: 'OWNER' });
      expect(res.executionStatus).toBe('APPROVAL_WAITING');
      expect(res.approvalStatus).toBe('PENDING');
      expect(res.approvalId).toBeDefined();
    });
  });

  describe('AG-007: Strict Idempotency Protection', () => {
    it('returns cached result when the same actionId is submitted twice', async () => {
      const uniqueActionId = `act-idempotent-${Date.now()}`;
      const action: AgentAction = {
        actionId: uniqueActionId,
        agentId: 'jarvis',
        actorType: 'AI_AGENT',
        requestedBy: 'owner-1',
        role: 'OWNER',
        tool: 'adjust_stock',
        input: { productId: 'p100', locationId: 'loc-wh', delta: 10, reason: 'Count fix' },
        riskLevel: 'HIGH_RISK_WRITE',
        autonomyLevel: 'L3_APPROVAL',
        approvalRequired: true,
        executionStatus: 'PLANNED',
        correlationId: 'corr-idem',
        createdAt: new Date().toISOString(),
      };

      const first = await preflightAndExecuteAgentAction(action, { actorId: 'owner-1', role: 'OWNER' });
      const second = await preflightAndExecuteAgentAction(action, { actorId: 'owner-1', role: 'OWNER' });

      expect(first.actionId).toBe(second.actionId);
      expect(second.executionStatus).toBe(first.executionStatus);
      expect(second.approvalId).toBe(first.approvalId);
    });
  });

  describe('AG-001 to AG-012 Tool Registry Inventory', () => {
    it('verifies all registered tools have schemas, roles, and risk classifications', () => {
      const tools = Object.values(AGENT_TOOL_REGISTRY);
      expect(tools.length).toBeGreaterThanOrEqual(8);

      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(['READ', 'LOW_RISK_WRITE', 'HIGH_RISK_WRITE', 'IRREVERSIBLE']).toContain(tool.riskLevel);
        expect([
          'L0_OBSERVE',
          'L1_RECOMMEND',
          'L2_DRAFT',
          'L3_APPROVAL',
          'L4_BOUNDED',
          'L5_FORBIDDEN',
        ]).toContain(tool.autonomyLevel);
        expect(Object.keys(tool.inputSchema).length).toBeGreaterThan(0);
      }
    });
  });
});
