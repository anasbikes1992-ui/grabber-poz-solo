import { eq, sql } from 'drizzle-orm';
import { db, auditLogs, stockBalances, products, orders } from '@/db';
import {
  AGENT_TOOL_REGISTRY,
  validateToolInput,
  AgentSecurityError,
  type AgentAction,
  type AgentToolDefinition,
} from './control-plane';
import { createApproval } from '@/lib/approvals/approval-store';
import { recordTransfer, recordAdjustment } from '@/lib/inventory/stock-service';
import { createDraftTransfer, dispatchTransfer, receiveTransfer } from '@/lib/inventory/transfer-workflow';
import { InsufficientStockError } from '@/lib/inventory/stock-invariants';

// Idempotency cache for agent executions (AG-007)
const executedActionCache = new Map<string, AgentAction>();

export async function preflightAndExecuteAgentAction(
  action: AgentAction,
  context: {
    actorId: string;
    role: string;
  },
): Promise<AgentAction> {
  const timestamp = new Date().toISOString();

  // 1. Check Idempotency (AG-007)
  if (executedActionCache.has(action.actionId)) {
    const cached = executedActionCache.get(action.actionId)!;
    return {
      ...cached,
      result: cached.result,
      executionStatus: cached.executionStatus,
      completedAt: cached.completedAt,
    };
  }

  // 2. AG-004: Absolute Prohibition of Arbitrary SQL
  if (
    action.tool === 'arbitrary_sql' ||
    action.input.sql ||
    action.input.query?.match(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\b/i)
  ) {
    throw new AgentSecurityError(
      'AG-004: Arbitrary SQL execution is strictly forbidden for all agents and tools',
      'FORBIDDEN_RAW_SQL',
      'AG-004',
    );
  }

  // 3. AG-001: Tool Contract & Schema Check
  const toolDef = AGENT_TOOL_REGISTRY[action.tool];
  if (!toolDef) {
    throw new AgentSecurityError(
      `AG-001: Unregistered agent tool '${action.tool}'`,
      'UNREGISTERED_TOOL',
      'AG-001',
    );
  }

  const { valid, errors } = validateToolInput(toolDef, action.input);
  if (!valid) {
    return {
      ...action,
      riskLevel: toolDef.riskLevel,
      autonomyLevel: toolDef.autonomyLevel,
      approvalRequired: toolDef.approvalRequired,
      executionStatus: 'PREFLIGHT_FAILED',
      error: `AG-001 Validation Error: ${errors.join(', ')}`,
      completedAt: timestamp,
    };
  }

  // 4. AG-002 & AG-010: Authorization & Privilege Escalation Immunity
  if (toolDef.requiredRole !== 'ANY') {
    const roleHierarchy: Record<string, number> = {
      OWNER: 100,
      ADMIN: 90,
      MANAGER: 70,
      WAREHOUSE: 50,
      ACCOUNTANT: 50,
      CASHIER: 30,
      MARKETING: 30,
    };

    const userRank = roleHierarchy[context.role] || 0;
    const requiredRank = roleHierarchy[toolDef.requiredRole] || 100;

    if (userRank < requiredRank) {
      throw new AgentSecurityError(
        `AG-010: Privilege Escalation Blocked. Tool '${action.tool}' requires role '${toolDef.requiredRole}' but caller has '${context.role}'`,
        'PRIVILEGE_ESCALATION_DENIED',
        'AG-010',
      );
    }
  }

  // 5. AG-003: Approval Bridge for High-Risk Writes
  if (toolDef.approvalRequired && action.approvalStatus !== 'APPROVED') {
    const approval = await createApproval({
      token: `AGENT_APPR_${action.actionId.slice(0, 8)}_${Date.now()}`,
      toolName: `agent:${action.tool}`,
      description: `Agent action ${action.tool} requires human approval: ${JSON.stringify(action.input)}`,
      risk: toolDef.riskLevel,
      payload: {
        actionId: action.actionId,
        agentId: action.agentId,
        tool: action.tool,
        input: action.input,
        correlationId: action.correlationId,
      },
      requestedBy: context.actorId,
      role: context.role,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    const pendingAction: AgentAction = {
      ...action,
      riskLevel: toolDef.riskLevel,
      autonomyLevel: toolDef.autonomyLevel,
      approvalRequired: true,
      approvalStatus: 'PENDING',
      approvalId: approval.id,
      executionStatus: 'APPROVAL_WAITING',
      completedAt: timestamp,
    };

    executedActionCache.set(action.actionId, pendingAction);
    return pendingAction;
  }

  // 6. AG-005 & AG-012: Canonical Service Routing & Invariant Protection
  let result: any = null;
  try {
    if (action.tool === 'get_inventory_balance') {
      const { productId, locationId } = action.input;
      const rows = await db
        .select()
        .from(stockBalances)
        .where(locationId ? eq(stockBalances.locationId, locationId) : eq(stockBalances.productId, productId));
      result = { balances: rows };
    } else if (action.tool === 'search_products') {
      const { query } = action.input;
      const rows = await db
        .select()
        .from(products)
        .where(sql`${products.name} ILIKE ${'%' + query + '%'} OR ${products.sku} ILIKE ${'%' + query + '%'}`)
        .limit(20);
      result = { products: rows };
    } else if (action.tool === 'get_order_status') {
      const { orderNumber } = action.input;
      const [ord] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
      result = { order: ord || null };
    } else if (action.tool === 'draft_stock_transfer') {
      const { fromLocationType, fromLocationId, toLocationType, toLocationId, items } = action.input;
      const tr = await db.transaction(async (tx) => {
        return createDraftTransfer(tx, {
          transferNumber: `TRF-AG-${Date.now().toString().slice(-6)}`,
          fromLocationType,
          fromLocationId,
          toLocationType,
          toLocationId,
          items,
          actorId: context.actorId,
        });
      });
      result = { transfer: tr };
    } else if (action.tool === 'execute_stock_transfer') {
      const { transferId, action: transferAction } = action.input;
      if (transferAction === 'dispatch') {
        const tr = await db.transaction(async (tx) => dispatchTransfer(tx, transferId, context.actorId));
        result = { transfer: tr };
      } else if (transferAction === 'receive') {
        const tr = await db.transaction(async (tx) => receiveTransfer(tx, transferId, action.input.items || [], context.actorId));
        result = { transfer: tr };
      }
    } else if (action.tool === 'adjust_stock') {
      const { productId, locationId, delta, reason } = action.input;
      await db.transaction(async (tx) => {
        return recordAdjustment(
          tx,
          { locationType: 'WAREHOUSE', locationId },
          { productId, quantity: Number(delta) },
          { referenceType: 'AGENT_ADJUSTMENT', referenceId: action.actionId, actorId: context.actorId, notes: reason },
        );
      });
      result = { adjusted: true, delta };
    } else {
      result = { executed: true };
    }

    // 7. AG-006: Immutable Audit Attribution
    const auditRisk =
      toolDef.riskLevel === 'IRREVERSIBLE'
        ? ('DESTRUCTIVE' as const)
        : (toolDef.riskLevel as 'READ' | 'LOW_RISK_WRITE' | 'HIGH_RISK_WRITE');

    await db.insert(auditLogs).values({
      actorId: context.actorId,
      actorRole: context.role,
      action: `AGENT_${action.tool.toUpperCase()}`,
      entity: 'AGENT_ACTION',
      entityId: action.actionId,
      riskLevel: auditRisk,
      afterState: {
        agentId: action.agentId,
        tool: action.tool,
        input: action.input,
        correlationId: action.correlationId,
      },
    });

    const completedAction: AgentAction = {
      ...action,
      riskLevel: toolDef.riskLevel,
      autonomyLevel: toolDef.autonomyLevel,
      approvalRequired: toolDef.approvalRequired,
      approvalStatus: toolDef.approvalRequired ? 'APPROVED' : 'NOT_REQUIRED',
      executionStatus: 'EXECUTED',
      result,
      completedAt: new Date().toISOString(),
    };

    executedActionCache.set(action.actionId, completedAction);
    return completedAction;
  } catch (err: any) {
    const failedAction: AgentAction = {
      ...action,
      riskLevel: toolDef.riskLevel,
      autonomyLevel: toolDef.autonomyLevel,
      approvalRequired: toolDef.approvalRequired,
      executionStatus: 'FAILED',
      error: err.message || 'Execution error',
      completedAt: new Date().toISOString(),
    };
    return failedAction;
  }
}
