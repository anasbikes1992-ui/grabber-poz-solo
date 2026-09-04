/**
 * GRABBER BUSINESS OS — AGENT CONTROL PLANE
 *
 * Implements deterministic agent execution boundaries:
 * AG-001: Explicit Tool Input/Output Schemas
 * AG-002: Tool Authorization Policies
 * AG-003: Approval Bridge for High-Risk Writes
 * AG-004: Absolute Prohibition of Arbitrary SQL
 * AG-005: Canonical Commerce Service Routing
 * AG-006: Immutable Audit Attribution
 * AG-007: Strict Idempotency
 * AG-010: Privilege Escalation Immunity
 * AG-011: Immutability of Financial & Certified Records
 * AG-012: Invariant Compliance
 */

export type RiskLevel = 'READ' | 'LOW_RISK_WRITE' | 'HIGH_RISK_WRITE' | 'IRREVERSIBLE';

export type AutonomyLevel =
  | 'L0_OBSERVE'
  | 'L1_RECOMMEND'
  | 'L2_DRAFT'
  | 'L3_APPROVAL'
  | 'L4_BOUNDED'
  | 'L5_FORBIDDEN';

export type ToolParamSchema = {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
};

export type AgentToolDefinition = {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  autonomyLevel: AutonomyLevel;
  requiredRole: 'OWNER' | 'MANAGER' | 'CASHIER' | 'WAREHOUSE' | 'ANY';
  approvalRequired: boolean;
  inputSchema: Record<string, ToolParamSchema>;
};

export type AgentAction = {
  actionId: string;
  agentId: string;
  taskId?: string;
  actorType: 'HUMAN' | 'AI_AGENT' | 'AUTOMATION';
  requestedBy: string;
  role: string;
  tool: string;
  input: Record<string, any>;
  riskLevel: RiskLevel;
  autonomyLevel: AutonomyLevel;
  approvalRequired: boolean;
  approvalStatus?: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalId?: string;
  executionStatus: 'PLANNED' | 'PREFLIGHT_FAILED' | 'APPROVAL_WAITING' | 'EXECUTED' | 'FAILED';
  result?: any;
  error?: string;
  correlationId: string;
  createdAt: string;
  completedAt?: string;
};

export class AgentSecurityError extends Error {
  readonly code: string;
  readonly invariant: string;

  constructor(message: string, code = 'AGENT_SECURITY_VIOLATION', invariant = 'AG-004') {
    super(message);
    this.name = 'AgentSecurityError';
    this.code = code;
    this.invariant = invariant;
  }
}

/**
 * Authoritative Agent Tool Registry (AG-001, AG-002, AG-003, AG-004)
 */
export const AGENT_TOOL_REGISTRY: Record<string, AgentToolDefinition> = {
  get_inventory_balance: {
    name: 'get_inventory_balance',
    description: 'Retrieve live on-hand and reserved stock for a product at a location',
    riskLevel: 'READ',
    autonomyLevel: 'L0_OBSERVE',
    requiredRole: 'ANY',
    approvalRequired: false,
    inputSchema: {
      productId: { type: 'string', required: true, description: 'Product UUID' },
      locationId: { type: 'string', required: false, description: 'Optional location UUID' },
    },
  },

  search_products: {
    name: 'search_products',
    description: 'Search catalog products by query string, SKU, or category',
    riskLevel: 'READ',
    autonomyLevel: 'L0_OBSERVE',
    requiredRole: 'ANY',
    approvalRequired: false,
    inputSchema: {
      query: { type: 'string', required: true, description: 'Search term' },
    },
  },

  get_order_status: {
    name: 'get_order_status',
    description: 'Query status, payment state, and lines of an order',
    riskLevel: 'READ',
    autonomyLevel: 'L0_OBSERVE',
    requiredRole: 'ANY',
    approvalRequired: false,
    inputSchema: {
      orderNumber: { type: 'string', required: true, description: 'Order reference number' },
    },
  },

  draft_stock_transfer: {
    name: 'draft_stock_transfer',
    description: 'Prepare a draft inter-location stock transfer without moving inventory',
    riskLevel: 'LOW_RISK_WRITE',
    autonomyLevel: 'L2_DRAFT',
    requiredRole: 'WAREHOUSE',
    approvalRequired: false,
    inputSchema: {
      fromLocationType: { type: 'string', required: true, description: 'BRANCH or WAREHOUSE' },
      fromLocationId: { type: 'string', required: true, description: 'Source location UUID' },
      toLocationType: { type: 'string', required: true, description: 'BRANCH or WAREHOUSE' },
      toLocationId: { type: 'string', required: true, description: 'Destination location UUID' },
      items: { type: 'array', required: true, description: 'Array of { productId, quantity }' },
    },
  },

  draft_purchase_order: {
    name: 'draft_purchase_order',
    description: 'Draft a reorder purchase order line for manager approval',
    riskLevel: 'LOW_RISK_WRITE',
    autonomyLevel: 'L2_DRAFT',
    requiredRole: 'MANAGER',
    approvalRequired: false,
    inputSchema: {
      supplierId: { type: 'string', required: true, description: 'Supplier UUID' },
      items: { type: 'array', required: true, description: 'Array of { productId, quantity, unitCost }' },
    },
  },

  execute_stock_transfer: {
    name: 'execute_stock_transfer',
    description: 'Dispatch or receive stock transfer between locations (Deducts or adds inventory)',
    riskLevel: 'HIGH_RISK_WRITE',
    autonomyLevel: 'L3_APPROVAL',
    requiredRole: 'MANAGER',
    approvalRequired: true,
    inputSchema: {
      transferId: { type: 'string', required: true, description: 'Transfer UUID' },
      action: { type: 'string', required: true, description: 'dispatch or receive' },
    },
  },

  adjust_stock: {
    name: 'adjust_stock',
    description: 'Adjust inventory balance due to damaged goods, cycle count, or expiry',
    riskLevel: 'HIGH_RISK_WRITE',
    autonomyLevel: 'L3_APPROVAL',
    requiredRole: 'OWNER',
    approvalRequired: true,
    inputSchema: {
      productId: { type: 'string', required: true, description: 'Product UUID' },
      locationId: { type: 'string', required: true, description: 'Location UUID' },
      delta: { type: 'number', required: true, description: 'Positive or negative stock adjustment' },
      reason: { type: 'string', required: true, description: 'Audit rationale' },
    },
  },

  issue_refund: {
    name: 'issue_refund',
    description: 'Process return refund to customer and adjust ledger balances',
    riskLevel: 'HIGH_RISK_WRITE',
    autonomyLevel: 'L3_APPROVAL',
    requiredRole: 'OWNER',
    approvalRequired: true,
    inputSchema: {
      orderId: { type: 'string', required: true, description: 'Order UUID' },
      refundAmount: { type: 'number', required: true, description: 'Amount in LKR' },
      reason: { type: 'string', required: true, description: 'Audit reason' },
    },
  },

  get_dashboard_summary: {
    name: 'get_dashboard_summary',
    description: 'Retrieve real-time business health: daily sales, receivables, cash, low stock items',
    riskLevel: 'READ',
    autonomyLevel: 'L0_OBSERVE',
    requiredRole: 'ANY',
    approvalRequired: false,
    inputSchema: {
      period: { type: 'string', required: false, description: 'Optional period: today, week, month' },
    },
  },

  get_low_stock: {
    name: 'get_low_stock',
    description: 'List products currently at or below safety stock threshold',
    riskLevel: 'READ',
    autonomyLevel: 'L0_OBSERVE',
    requiredRole: 'ANY',
    approvalRequired: false,
    inputSchema: {
      locationId: { type: 'string', required: false, description: 'Optional location UUID filter' },
    },
  },

  get_customer_balance: {
    name: 'get_customer_balance',
    description: 'Lookup credit balance, outstanding receivables, and loyalty points for a customer',
    riskLevel: 'READ',
    autonomyLevel: 'L0_OBSERVE',
    requiredRole: 'ANY',
    approvalRequired: false,
    inputSchema: {
      customerId: { type: 'string', required: true, description: 'Customer UUID' },
    },
  },

  get_sales_summary: {
    name: 'get_sales_summary',
    description: 'Query sales totals, order volume, and channel breakdowns for a time window',
    riskLevel: 'READ',
    autonomyLevel: 'L0_OBSERVE',
    requiredRole: 'MANAGER',
    approvalRequired: false,
    inputSchema: {
      startDate: { type: 'string', required: false, description: 'ISO date string' },
      endDate: { type: 'string', required: false, description: 'ISO date string' },
    },
  },

  get_profit_summary: {
    name: 'get_profit_summary',
    description: 'Calculate gross profit, revenue, and COGS for an accounting period',
    riskLevel: 'READ',
    autonomyLevel: 'L0_OBSERVE',
    requiredRole: 'OWNER',
    approvalRequired: false,
    inputSchema: {
      startDate: { type: 'string', required: false, description: 'ISO date string' },
      endDate: { type: 'string', required: false, description: 'ISO date string' },
    },
  },

  draft_promotion: {
    name: 'draft_promotion',
    description: 'Draft a promotion rule for discounts, category promos, or bundle deals',
    riskLevel: 'LOW_RISK_WRITE',
    autonomyLevel: 'L2_DRAFT',
    requiredRole: 'MANAGER',
    approvalRequired: false,
    inputSchema: {
      name: { type: 'string', required: true, description: 'Promotion campaign name' },
      discountPercent: { type: 'number', required: false, description: 'Percentage off' },
      discountAmount: { type: 'number', required: false, description: 'Flat amount off' },
    },
  },

  arbitrary_sql: {
    name: 'arbitrary_sql',
    description: 'FORBIDDEN: Raw SQL execution attempts are strictly blocked',
    riskLevel: 'IRREVERSIBLE',
    autonomyLevel: 'L5_FORBIDDEN',
    requiredRole: 'OWNER',
    approvalRequired: true,
    inputSchema: {
      sql: { type: 'string', required: true, description: 'Raw SQL' },
    },
  },
};

export type AgentBudgetConfig = {
  maxToolCallsPerTask: number;
  maxMonetaryAmount: number;
  maxStockQuantity: number;
  maxRetries: number;
};

export const DEFAULT_AGENT_BUDGET: AgentBudgetConfig = {
  maxToolCallsPerTask: 10,
  maxMonetaryAmount: 500000, // 500,000 LKR
  maxStockQuantity: 500, // 500 units
  maxRetries: 3,
};

/**
 * Validate input fields against a tool definition (AG-001)
 */
export function validateToolInput(tool: AgentToolDefinition, input: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const [paramName, schema] of Object.entries(tool.inputSchema)) {
    if (schema.required && (input[paramName] === undefined || input[paramName] === null || input[paramName] === '')) {
      errors.push(`Missing required parameter: '${paramName}'`);
    }
  }
  return { valid: errors.length === 0, errors };
}

