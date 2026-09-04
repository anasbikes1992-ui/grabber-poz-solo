import { eq, and, sql } from 'drizzle-orm';
import { db, auditLogs, stockBalances, products, orders, customers, polimPothaAccounts } from '@/db';
import {
  AGENT_TOOL_REGISTRY,
  validateToolInput,
  AgentSecurityError,
  DEFAULT_AGENT_BUDGET,
  type AgentAction,
  type AgentToolDefinition,
} from './control-plane';
import { createApproval } from '@/lib/approvals/approval-store';
import { recordTransfer, recordAdjustment } from '@/lib/inventory/stock-service';
import { createDraftTransfer, dispatchTransfer, receiveTransfer } from '@/lib/inventory/transfer-workflow';
import { InsufficientStockError } from '@/lib/inventory/stock-invariants';
import {
  getDurableIdempotencyResult,
  saveDurableIdempotencyResult,
} from '@/lib/security/durable-idempotency';

export async function preflightAndExecuteAgentAction(
  action: AgentAction,
  context: {
    actorId: string;
    role: string;
  },
): Promise<AgentAction> {
  const timestamp = new Date().toISOString();

  // 1. Check Durable Idempotency across process restarts (AG-007)
  const existingCached = await getDurableIdempotencyResult<AgentAction>('AGENT_ACTION', action.actionId);
  if (existingCached) {
    return {
      ...existingCached,
      result: existingCached.result,
      executionStatus: existingCached.executionStatus,
      completedAt: existingCached.completedAt,
    };
  }

  // 2. AG-004: Absolute Prohibition of Arbitrary SQL
  if (
    action.tool === 'arbitrary_sql' ||
    action.input?.sql ||
    action.input?.query?.match(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\b/i)
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

  const { valid, errors } = validateToolInput(toolDef, action.input || {});
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

  // 4. Agent Safety Budgets & Quantity/Monetary Guards
  if (action.input?.delta != null && Math.abs(Number(action.input.delta)) > DEFAULT_AGENT_BUDGET.maxStockQuantity) {
    throw new AgentSecurityError(
      `AG-012: Quantity ${Math.abs(Number(action.input.delta))} exceeds agent safety budget limit (${DEFAULT_AGENT_BUDGET.maxStockQuantity} units)`,
      'AGENT_BUDGET_EXCEEDED',
      'AG-012',
    );
  }
  if (action.input?.refundAmount != null && Number(action.input.refundAmount) > DEFAULT_AGENT_BUDGET.maxMonetaryAmount) {
    throw new AgentSecurityError(
      `AG-012: Monetary amount LKR ${action.input.refundAmount} exceeds agent financial safety limit (${DEFAULT_AGENT_BUDGET.maxMonetaryAmount} LKR)`,
      'AGENT_FINANCIAL_BUDGET_EXCEEDED',
      'AG-012',
    );
  }

  // 5. AG-013: State Freshness Invariant (Abort if underlying state mutated)
  if (action.input?.expectedBalance != null && action.input?.productId && action.input?.locationId) {
    let liveQty = 0;
    try {
      const [currentBalance] = await db
        .select()
        .from(stockBalances)
        .where(and(eq(stockBalances.productId, action.input.productId), eq(stockBalances.locationId, action.input.locationId)))
        .limit(1);
      liveQty = currentBalance ? Number(currentBalance.onHand) : 0;
    } catch {
      liveQty = 0;
    }

    if (liveQty !== Number(action.input.expectedBalance)) {
      throw new AgentSecurityError(
        `AG-013: State Freshness Violation. Product inventory changed from expected ${action.input.expectedBalance} to current ${liveQty}. Aborting execution to prevent stale update.`,
        'STALE_STATE_ABORT',
        'AG-013',
      );
    }
  }

  // 6. AG-002 & AG-010: Authorization & Privilege Escalation Immunity
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

  // 7. AG-003: Approval Bridge for High-Risk Writes
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

    await saveDurableIdempotencyResult('AGENT_ACTION', action.actionId, pendingAction);
    return pendingAction;
  }

  // 8. AG-005 & AG-012: Canonical Service Routing & Invariant Protection
  let result: any = null;
  try {
    if (action.tool === 'get_inventory_balance') {
      const { productId, locationId } = action.input;
      const rows = await db
        .select()
        .from(stockBalances)
        .where(locationId ? eq(stockBalances.locationId, locationId) : eq(stockBalances.productId, productId));
      result = { balances: rows };
    } else if (action.tool === 'get_dashboard_summary') {
      const allOrders = await db.select().from(orders).limit(50);
      const totalSales = allOrders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
      result = { totalOrders: allOrders.length, totalSales, liveStatus: 'HEALTHY' };
    } else if (action.tool === 'get_low_stock') {
      const lowRows = await db.select().from(stockBalances).where(sql`${stockBalances.onHand} <= 10`).limit(20);
      result = { lowStockItems: lowRows };
    } else if (action.tool === 'get_customer_balance') {
      const { customerId } = action.input;
      const [acc] = await db.select().from(polimPothaAccounts).where(eq(polimPothaAccounts.customerId, customerId)).limit(1);
      result = { account: acc || null };
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

    // 9. AG-006: Immutable Audit Attribution
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

    await saveDurableIdempotencyResult('AGENT_ACTION', action.actionId, completedAction);
    return completedAction;
  } catch (err: any) {
    if (err instanceof AgentSecurityError) {
      throw err;
    }
    const failedAction: AgentAction = {
      ...action,
      riskLevel: toolDef.riskLevel,
      autonomyLevel: toolDef.autonomyLevel,
      approvalRequired: toolDef.approvalRequired,
      executionStatus: 'FAILED',
      error: err.message || 'Execution error',
      completedAt: new Date().toISOString(),
    };
    await saveDurableIdempotencyResult('AGENT_ACTION', action.actionId, failedAction);
    return failedAction;
  }
}

