/**
 * GRABBER BUSINESS OS — JARVIS TYPED TOOLS REGISTRY & EXECUTOR
 * Authorized, Grounded Tool Calls with Multi-Tier Action Confirmation
 */

import { JarvisToolDefinition, JarvisUserContext, JarvisToolExecutionResult } from './jarvis-types';
import { JARVIS_DB_TOOLS } from './jarvis-db-tools';
import { createApproval } from '@/lib/approvals/approval-store';
import { defaultCommerceService, CommerceService } from '../commerce/commerce-service';
import { defaultInventoryEngine, InventoryEngine } from '../commerce/inventory-engine';
import { defaultCreditEngine, CreditEngine } from '../commerce/credit-engine';
import { defaultAccountingEngine, AccountingEngine } from '../commerce/accounting-engine';

export class JarvisToolRegistry {
  private tools: Map<string, JarvisToolDefinition> = new Map();
  private pendingConfirmations: Map<string, { tool: JarvisToolDefinition; args: any; context: JarvisUserContext; expiresAt: number }> = new Map();

  private commerceService: CommerceService;
  private inventoryEngine: InventoryEngine;
  private creditEngine: CreditEngine;
  private accountingEngine: AccountingEngine;

  constructor(
    commerceService: CommerceService = defaultCommerceService,
    inventoryEngine: InventoryEngine = defaultInventoryEngine,
    creditEngine: CreditEngine = defaultCreditEngine,
    accountingEngine: AccountingEngine = defaultAccountingEngine
  ) {
    this.commerceService = commerceService;
    this.inventoryEngine = inventoryEngine;
    this.creditEngine = creditEngine;
    this.accountingEngine = accountingEngine;
    this.registerCoreTools();
    for (const tool of JARVIS_DB_TOOLS) {
      this.registerTool(tool);
    }
  }

  public registerTool(tool: JarvisToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  private registerCoreTools() {
    // 1. READ: Get Stock Summary
    this.registerTool({
      name: 'get_stock_summary',
      description: 'Retrieve real-time on-hand, reserved, and available inventory per branch or warehouse.',
      risk: 'READ',
      execute: async (args: { locationId: string; productId?: string; variantId?: string }, context) => {
        // Enforce location scoping for branch/warehouse staff
        if (['MANAGER', 'CASHIER'].includes(context.role) && !context.assignedBranchIds.includes(args.locationId)) {
          throw new Error('Access denied to stock outside assigned branch.');
        }
        const state = this.inventoryEngine.getBalance('BRANCH', args.locationId, args.productId || 'all', args.variantId);
        return { locationId: args.locationId, stock: state };
      },
    });

    // 2. READ: Get Customer Credit & Aging (Polim Potha)
    this.registerTool({
      name: 'get_customer_credit_report',
      description: 'Look up Polim Potha customer credit limits, outstanding balances, and aging buckets.',
      risk: 'READ',
      execute: async (args: { customerId: string }) => {
        const account = this.creditEngine.getAccount(args.customerId);
        const aging = this.creditEngine.getAgingReport(args.customerId);
        return { account, aging };
      },
    });

    // 3. DRAFT: Draft Purchase Order
    this.registerTool({
      name: 'draft_purchase_order',
      description: 'Draft a purchase order for supplier restocking without committing an approval or financial entry.',
      risk: 'DRAFT',
      execute: async (args: { supplierId: string; warehouseId: string; items: any[] }, context) => {
        return {
          draftPONumber: `DRAFT-PO-${Date.now()}`,
          supplierId: args.supplierId,
          warehouseId: args.warehouseId,
          items: args.items,
          status: 'DRAFT_CREATED',
          createdBy: context.userId,
        };
      },
    });

    // 4. HIGH_RISK_WRITE: Propose Stock Transfer between Locations
    this.registerTool({
      name: 'propose_stock_transfer',
      description: 'Execute an inter-branch or warehouse stock transfer. Requires explicit user confirmation.',
      risk: 'HIGH_RISK_WRITE',
      requiredRole: ['OWNER', 'ADMIN', 'MANAGER'],
      execute: async (args: { fromLocationId: string; toLocationId: string; items: Array<{ productId: string; quantity: number }> }, context) => {
        const transferNumber = `TRF-${Date.now()}`;
        const res = this.commerceService.transferStock({
          transferNumber,
          fromLocationType: 'WAREHOUSE',
          fromLocationId: args.fromLocationId,
          toLocationType: 'BRANCH',
          toLocationId: args.toLocationId,
          items: args.items,
          actorId: context.userId,
        });
        return { status: 'TRANSFER_COMPLETED', result: res };
      },
    });

    // 5. DESTRUCTIVE: Bulk Delete (Blocked)
    this.registerTool({
      name: 'bulk_delete_records',
      description: 'Permanent deletion of historical business records. Blocked by safety guardrails.',
      risk: 'DESTRUCTIVE',
      execute: async () => {
        throw new Error('Destructive operations are strictly prohibited on production records.');
      },
    });
  }

  /**
   * Invokes a tool by name with permission verification and risk classification checks.
   */
  public async invokeTool(toolName: string, args: any, context: JarvisUserContext): Promise<JarvisToolExecutionResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        toolName,
        risk: 'READ',
        status: 'ERROR',
        errorMessage: `Tool "${toolName}" not found in registry.`,
      };
    }

    // Role verification
    if (tool.requiredRole && !tool.requiredRole.includes(context.role)) {
      return {
        toolName,
        risk: tool.risk,
        status: 'BLOCKED_PERMISSION',
        errorMessage: `Role "${context.role}" is not authorized to execute tool "${toolName}". Required: ${tool.requiredRole.join(', ')}.`,
      };
    }

    // Safe execution for READ and DRAFT
    if (tool.risk === 'READ' || tool.risk === 'DRAFT' || tool.risk === 'LOW_RISK_WRITE') {
      try {
        const data = await tool.execute(args, context);
        return { toolName, risk: tool.risk, status: 'EXECUTED', data };
      } catch (err: any) {
        return { toolName, risk: tool.risk, status: 'ERROR', errorMessage: err.message };
      }
    }

    // High Risk: Generate Confirmation Token & Prompt User
    if (tool.risk === 'HIGH_RISK_WRITE') {
      const token = `CONFIRM_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      this.pendingConfirmations.set(token, {
        tool,
        args,
        context,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
      });

      await createApproval({
        token,
        toolName,
        description: tool.description,
        risk: tool.risk,
        payload: args,
        requestedBy: context.userId,
        role: context.role,
        expiresAt,
      });

      return {
        toolName,
        risk: tool.risk,
        status: 'CONFIRMATION_REQUIRED',
        confirmationToken: token,
        confirmationDetails: {
          actionDescription: tool.description,
          affectedEntities: Object.keys(args),
          riskSummary: 'This action will mutate physical stock balances across business locations.',
          payload: args,
        },
      };
    }

    // Destructive
    return {
      toolName,
      risk: 'DESTRUCTIVE',
      status: 'BLOCKED_PERMISSION',
      errorMessage: 'Safety Policy: Destructive database modifications are blocked.',
    };
  }

  /**
   * Confirms and executes a pending high-risk tool action.
   */
  public async confirmToolExecution(token: string): Promise<JarvisToolExecutionResult> {
    const pending = this.pendingConfirmations.get(token);
    if (!pending) {
      return {
        toolName: 'unknown',
        risk: 'HIGH_RISK_WRITE',
        status: 'ERROR',
        errorMessage: 'Invalid or expired confirmation token.',
      };
    }

    if (Date.now() > pending.expiresAt) {
      this.pendingConfirmations.delete(token);
      return {
        toolName: pending.tool.name,
        risk: pending.tool.risk,
        status: 'ERROR',
        errorMessage: 'Confirmation token has expired.',
      };
    }

    this.pendingConfirmations.delete(token);

    try {
      const data = await pending.tool.execute(pending.args, pending.context);
      return {
        toolName: pending.tool.name,
        risk: pending.tool.risk,
        status: 'EXECUTED',
        data,
      };
    } catch (err: any) {
      return {
        toolName: pending.tool.name,
        risk: pending.tool.risk,
        status: 'ERROR',
        errorMessage: err.message,
      };
    }
  }
}

export const defaultJarvisToolRegistry = new JarvisToolRegistry();
