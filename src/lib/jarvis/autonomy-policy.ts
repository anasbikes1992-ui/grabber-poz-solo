/**
 * GRABBER BUSINESS OS — ACTION POLICY MATRIX & AUTONOMY ENGINE
 * Fine-grained autonomy controls for Jarvis and agent operations.
 */

export type AutonomyMode = 'RECOMMEND' | 'DRAFT' | 'APPROVAL' | 'AUTO';

export type ActionCategory = 
  | 'REPORTS_AND_BRIEFS'
  | 'ALERTS_AND_NOTIFICATIONS'
  | 'PURCHASE_ORDERS'
  | 'STOCK_TRANSFERS'
  | 'PROMOTIONS'
  | 'PRICING_UPDATES'
  | 'WHATSAPP_MESSAGES'
  | 'SEO_METADATA'
  | 'CONTENT_PUBLISHING'
  | 'CUSTOMER_FOLLOWUPS'
  | 'FINANCIAL_REFUNDS'
  | 'FINANCIAL_TRANSFERS'
  | 'USER_PERMISSIONS';

export interface ActionPolicy {
  category: ActionCategory;
  name: string;
  description: string;
  defaultMode: AutonomyMode;
  currentMode: AutonomyMode;
  maxTransactionValue?: number; // Max LKR amount allowed for auto execution
  maxDailyFrequency?: number;   // Max executions allowed per 24 hours
  cooldownHours?: number;       // Minimum hours between executions
  allowedRoles: string[];       // Staff roles authorized to approve or trigger
  requireConfirmation: boolean; // Always require human confirmation if in APPROVAL mode
  hardSafetyLock: boolean;      // If true, CANNOT be set to AUTO under any circumstance
}

/**
 * Default Action Policy Matrix.
 * High-risk financial, destructive, and permission changes are hard-locked against autonomous execution.
 */
export const DEFAULT_ACTION_POLICIES: Record<ActionCategory, ActionPolicy> = {
  REPORTS_AND_BRIEFS: {
    category: 'REPORTS_AND_BRIEFS',
    name: 'Daily & Weekly Briefs',
    description: 'Autonomous generation of daily sales summaries, morning briefs, and performance reports.',
    defaultMode: 'AUTO',
    currentMode: 'AUTO',
    maxDailyFrequency: 24,
    allowedRoles: ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'],
    requireConfirmation: false,
    hardSafetyLock: false,
  },
  ALERTS_AND_NOTIFICATIONS: {
    category: 'ALERTS_AND_NOTIFICATIONS',
    name: 'Stock & Operational Alerts',
    description: 'Real-time alert dispatch for low stock, anomaly spikes, and system warnings.',
    defaultMode: 'AUTO',
    currentMode: 'AUTO',
    maxDailyFrequency: 50,
    allowedRoles: ['OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'],
    requireConfirmation: false,
    hardSafetyLock: false,
  },
  PURCHASE_ORDERS: {
    category: 'PURCHASE_ORDERS',
    name: 'Draft Purchase Orders',
    description: 'Creation and submission of supplier restocking purchase orders.',
    defaultMode: 'APPROVAL',
    currentMode: 'APPROVAL',
    maxTransactionValue: 100000,
    maxDailyFrequency: 5,
    cooldownHours: 6,
    allowedRoles: ['OWNER', 'ADMIN', 'MANAGER'],
    requireConfirmation: true,
    hardSafetyLock: false,
  },
  STOCK_TRANSFERS: {
    category: 'STOCK_TRANSFERS',
    name: 'Inter-Branch Stock Transfers',
    description: 'Moving stock between warehouses and retail counter branches.',
    defaultMode: 'APPROVAL',
    currentMode: 'APPROVAL',
    maxDailyFrequency: 10,
    cooldownHours: 2,
    allowedRoles: ['OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'],
    requireConfirmation: true,
    hardSafetyLock: false,
  },
  PROMOTIONS: {
    category: 'PROMOTIONS',
    name: 'Promotions & Discounts',
    description: 'Enabling or modifying cart discounts, coupons, and seasonal sales campaigns.',
    defaultMode: 'APPROVAL',
    currentMode: 'APPROVAL',
    maxDailyFrequency: 3,
    cooldownHours: 12,
    allowedRoles: ['OWNER', 'ADMIN', 'MARKETING'],
    requireConfirmation: true,
    hardSafetyLock: false,
  },
  PRICING_UPDATES: {
    category: 'PRICING_UPDATES',
    name: 'Catalog Price Changes',
    description: 'Directly modifying base product retail prices or margin markups.',
    defaultMode: 'APPROVAL',
    currentMode: 'APPROVAL',
    maxTransactionValue: 50000,
    maxDailyFrequency: 2,
    cooldownHours: 24,
    allowedRoles: ['OWNER', 'ADMIN'],
    requireConfirmation: true,
    hardSafetyLock: false,
  },
  WHATSAPP_MESSAGES: {
    category: 'WHATSAPP_MESSAGES',
    name: 'WhatsApp Campaigns & Broadcasts',
    description: 'Outbound promotional and customer reactivation messaging blasts.',
    defaultMode: 'APPROVAL',
    currentMode: 'APPROVAL',
    maxDailyFrequency: 2,
    cooldownHours: 24,
    allowedRoles: ['OWNER', 'ADMIN', 'MARKETING'],
    requireConfirmation: true,
    hardSafetyLock: false,
  },
  SEO_METADATA: {
    category: 'SEO_METADATA',
    name: 'Product SEO & Meta Updates',
    description: 'Applying generated title tags, meta descriptions, and schema to product pages.',
    defaultMode: 'APPROVAL',
    currentMode: 'APPROVAL',
    maxDailyFrequency: 50,
    allowedRoles: ['OWNER', 'ADMIN', 'MARKETING'],
    requireConfirmation: true,
    hardSafetyLock: false,
  },
  CONTENT_PUBLISHING: {
    category: 'CONTENT_PUBLISHING',
    name: 'Storefront Content & Blogs',
    description: 'Publishing landing pages, category buying guides, and FAQs to the live storefront.',
    defaultMode: 'APPROVAL',
    currentMode: 'APPROVAL',
    maxDailyFrequency: 5,
    cooldownHours: 4,
    allowedRoles: ['OWNER', 'ADMIN', 'MARKETING'],
    requireConfirmation: true,
    hardSafetyLock: false,
  },
  CUSTOMER_FOLLOWUPS: {
    category: 'CUSTOMER_FOLLOWUPS',
    name: 'CRM & Lead Follow-ups',
    description: 'Triggering personalized cart recovery and high-intent inquiry follow-ups.',
    defaultMode: 'APPROVAL',
    currentMode: 'APPROVAL',
    maxDailyFrequency: 20,
    allowedRoles: ['OWNER', 'ADMIN', 'MANAGER'],
    requireConfirmation: true,
    hardSafetyLock: false,
  },
  FINANCIAL_REFUNDS: {
    category: 'FINANCIAL_REFUNDS',
    name: 'Customer Refunds & Reversals',
    description: 'Issuing cash, card, or credit refunds for returned items.',
    defaultMode: 'APPROVAL',
    currentMode: 'APPROVAL',
    allowedRoles: ['OWNER', 'ADMIN'],
    requireConfirmation: true,
    hardSafetyLock: true, // Non-negotiable: AI can never refund autonomously
  },
  FINANCIAL_TRANSFERS: {
    category: 'FINANCIAL_TRANSFERS',
    name: 'Bank & Financial Transfers',
    description: 'Direct ledger adjustments, cash payouts, or supplier disbursements.',
    defaultMode: 'APPROVAL',
    currentMode: 'APPROVAL',
    allowedRoles: ['OWNER', 'ACCOUNTANT'],
    requireConfirmation: true,
    hardSafetyLock: true, // Non-negotiable
  },
  USER_PERMISSIONS: {
    category: 'USER_PERMISSIONS',
    name: 'Staff & Role Management',
    description: 'Creating employees, resetting PINs, or modifying RBAC permission levels.',
    defaultMode: 'APPROVAL',
    currentMode: 'APPROVAL',
    allowedRoles: ['OWNER'],
    requireConfirmation: true,
    hardSafetyLock: true, // Non-negotiable
  },
};

export interface AutonomyEvaluationContext {
  category: ActionCategory;
  requestedMode?: AutonomyMode;
  userRole?: string;
  valueLkr?: number;
  recentExecutions24h?: number;
  lastExecutionAt?: Date;
}

export interface AutonomyDecision {
  allowed: boolean;
  effectiveMode: AutonomyMode;
  requiresHumanApproval: boolean;
  reason: string;
}

export class AutonomyPolicyEngine {
  private policies: Map<ActionCategory, ActionPolicy>;

  constructor(customPolicies?: Partial<Record<ActionCategory, ActionPolicy>>) {
    this.policies = new Map();
    for (const [key, val] of Object.entries(DEFAULT_ACTION_POLICIES)) {
      this.policies.set(key as ActionCategory, { ...val });
    }
    if (customPolicies) {
      for (const [key, val] of Object.entries(customPolicies)) {
        if (val) {
          const base = this.policies.get(key as ActionCategory);
          if (base) {
            // Prevent overriding hard safety locks to AUTO
            if (base.hardSafetyLock && val.currentMode === 'AUTO') {
              val.currentMode = 'APPROVAL';
            }
            this.policies.set(key as ActionCategory, { ...base, ...val });
          }
        }
      }
    }
  }

  public getPolicy(category: ActionCategory): ActionPolicy {
    const policy = this.policies.get(category);
    if (!policy) {
      throw new Error(`Unknown action category: ${category}`);
    }
    return policy;
  }

  public getAllPolicies(): ActionPolicy[] {
    return Array.from(this.policies.values());
  }

  public updatePolicy(
    category: ActionCategory,
    updates: Partial<Pick<ActionPolicy, 'currentMode' | 'maxTransactionValue' | 'maxDailyFrequency' | 'cooldownHours'>>
  ): ActionPolicy {
    const policy = this.getPolicy(category);
    if (policy.hardSafetyLock && updates.currentMode === 'AUTO') {
      throw new Error(`Action "${policy.name}" has a hard safety lock and cannot be set to AUTO.`);
    }
    const updated = { ...policy, ...updates };
    this.policies.set(category, updated);
    return updated;
  }

  public evaluateAction(ctx: AutonomyEvaluationContext): AutonomyDecision {
    const policy = this.getPolicy(ctx.category);

    // 1. Role verification
    if (ctx.userRole && !policy.allowedRoles.includes(ctx.userRole.toUpperCase())) {
      return {
        allowed: false,
        effectiveMode: policy.currentMode,
        requiresHumanApproval: true,
        reason: `Role "${ctx.userRole}" is not authorized for action category "${policy.name}". Required: ${policy.allowedRoles.join(', ')}`,
      };
    }

    // 2. Hard safety lock enforcement
    if (policy.hardSafetyLock) {
      return {
        allowed: true,
        effectiveMode: 'APPROVAL',
        requiresHumanApproval: true,
        reason: `Action "${policy.name}" is subject to a hard safety lock and always requires manual approval.`,
      };
    }

    // 3. Daily frequency cap
    if (policy.maxDailyFrequency && (ctx.recentExecutions24h || 0) >= policy.maxDailyFrequency) {
      return {
        allowed: false,
        effectiveMode: 'APPROVAL',
        requiresHumanApproval: true,
        reason: `Daily execution limit reached (${policy.maxDailyFrequency}/day). Human review required.`,
      };
    }

    // 4. Cooldown period check
    if (policy.cooldownHours && ctx.lastExecutionAt) {
      const elapsedHours = (Date.now() - ctx.lastExecutionAt.getTime()) / (1000 * 60 * 60);
      if (elapsedHours < policy.cooldownHours) {
        return {
          allowed: false,
          effectiveMode: 'APPROVAL',
          requiresHumanApproval: true,
          reason: `Action in cooldown. Next eligible run in ${(policy.cooldownHours - elapsedHours).toFixed(1)} hours.`,
        };
      }
    }

    // 5. Transaction value threshold check
    if (policy.maxTransactionValue && (ctx.valueLkr || 0) > policy.maxTransactionValue) {
      return {
        allowed: true,
        effectiveMode: 'APPROVAL',
        requiresHumanApproval: true,
        reason: `Transaction value (LKR ${(ctx.valueLkr || 0).toLocaleString()}) exceeds the autonomous threshold (LKR ${policy.maxTransactionValue.toLocaleString()}). Human approval required.`,
      };
    }

    // 6. Mode resolution
    const effectiveMode = ctx.requestedMode || policy.currentMode;
    const requiresHumanApproval = effectiveMode !== 'AUTO';

    return {
      allowed: true,
      effectiveMode,
      requiresHumanApproval,
      reason: requiresHumanApproval
        ? `Action queued for human approval under "${policy.name}" policy.`
        : `Action cleared for autonomous execution.`,
    };
  }
}
