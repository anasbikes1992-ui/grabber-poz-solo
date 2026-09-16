/**
 * GRABBER BUSINESS OS — JARVIS TYPED TOOLS REGISTRY & EXECUTOR
 * Authorized, Grounded Tool Calls with Multi-Tier Action Confirmation
 */

import { and, asc, eq } from 'drizzle-orm';
import { JarvisToolDefinition, JarvisUserContext, JarvisToolExecutionResult, JarvisActionRisk } from './jarvis-types';
import { JARVIS_DB_TOOLS } from './jarvis-db-tools';
import { executeJarvisDraftApproval } from '@/lib/jarvis/draft-execute';
import { createApproval, findApprovalByToken } from '@/lib/approvals/approval-store';
import { db, auditLogs, hasDatabaseUrl, stockBalances, polimPothaAccounts, polimPothaEntries, transfers, transferLines } from '@/db';
import { isDemoUserId } from '@/lib/auth/session';
import { recordTransfer } from '@/lib/inventory/stock-service';
import { defaultCommerceService, CommerceService } from '../commerce/commerce-service';
import { defaultAccountingEngine, AccountingEngine } from '../commerce/accounting-engine';

/** FIFO invoice aging, mirroring CreditEngine.getAgingReport but sourced from real Polim Potha ledger rows. */
function computePolimAgingFromEntries(
  entries: Array<{ type: string; amount: string | number; createdAt: Date }>,
  asOfDate: Date = new Date(),
) {
  const unpaidInvoices: Array<{ amount: number; date: Date }> = [];
  let repaymentPool = 0;

  for (const entry of entries) {
    const amount = Number(entry.amount);
    if (entry.type === 'INVOICE') {
      unpaidInvoices.push({ amount, date: entry.createdAt });
    } else if (entry.type === 'REPAYMENT' || entry.type === 'WRITE_OFF') {
      repaymentPool += amount;
    }
  }

  const nowMs = asOfDate.getTime();
  let days0to30 = 0;
  let days31to60 = 0;
  let days61to90 = 0;
  let days90Plus = 0;

  for (const inv of unpaidInvoices) {
    if (repaymentPool >= inv.amount) {
      repaymentPool -= inv.amount;
      continue;
    }
    const remainingAmount = inv.amount - repaymentPool;
    repaymentPool = 0;
    const ageInDays = Math.floor((nowMs - inv.date.getTime()) / (1000 * 60 * 60 * 24));

    if (ageInDays <= 30) days0to30 += remainingAmount;
    else if (ageInDays <= 60) days31to60 += remainingAmount;
    else if (ageInDays <= 90) days61to90 += remainingAmount;
    else days90Plus += remainingAmount;
  }

  return {
    days0to30: Math.round(days0to30 * 100) / 100,
    days31to60: Math.round(days31to60 * 100) / 100,
    days61to90: Math.round(days61to90 * 100) / 100,
    days90Plus: Math.round(days90Plus * 100) / 100,
  };
}

export class JarvisToolRegistry {
  private tools: Map<string, JarvisToolDefinition> = new Map();
  private pendingConfirmations: Map<string, { tool: JarvisToolDefinition; args: any; context: JarvisUserContext; expiresAt: number }> = new Map();

  private commerceService: CommerceService;
  private accountingEngine: AccountingEngine;

  constructor(
    commerceService: CommerceService = defaultCommerceService,
    accountingEngine: AccountingEngine = defaultAccountingEngine
  ) {
    this.commerceService = commerceService;
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
    // 1. READ: Get Stock Summary — DB-grounded (was reading a disconnected in-memory engine)
    this.registerTool({
      name: 'get_stock_summary',
      description: 'Retrieve real-time on-hand, reserved, and available inventory per branch or warehouse.',
      risk: 'READ',
      execute: async (args: { locationId: string; productId?: string; variantId?: string }, context) => {
        // Enforce location scoping for branch/warehouse staff
        if (['MANAGER', 'CASHIER'].includes(context.role) && !context.assignedBranchIds.includes(args.locationId)) {
          throw new Error('Access denied to stock outside assigned branch.');
        }

        if (args.productId) {
          const conditions = [eq(stockBalances.locationId, args.locationId), eq(stockBalances.productId, args.productId)];
          if (args.variantId) conditions.push(eq(stockBalances.variantId, args.variantId));
          const rows = await db.select().from(stockBalances).where(and(...conditions));
          const onHand = rows.reduce((s, r) => s + r.onHand, 0);
          const reserved = rows.reduce((s, r) => s + r.reserved, 0);
          return {
            locationId: args.locationId,
            productId: args.productId,
            variantId: args.variantId || null,
            onHand,
            reserved,
            available: Math.max(0, onHand - reserved),
          };
        }

        const rows = await db.select().from(stockBalances).where(eq(stockBalances.locationId, args.locationId));
        const totalOnHand = rows.reduce((s, r) => s + r.onHand, 0);
        const totalReserved = rows.reduce((s, r) => s + r.reserved, 0);
        return {
          locationId: args.locationId,
          skuCount: rows.length,
          totalOnHand,
          totalReserved,
          totalAvailable: Math.max(0, totalOnHand - totalReserved),
        };
      },
    });

    // 2. READ: Get Customer Credit & Aging (Polim Potha) — DB-grounded
    this.registerTool({
      name: 'get_customer_credit_report',
      description: 'Look up Polim Potha customer credit limits, outstanding balances, and aging buckets.',
      risk: 'READ',
      execute: async (args: { customerId: string }) => {
        const [account] = await db
          .select()
          .from(polimPothaAccounts)
          .where(eq(polimPothaAccounts.customerId, args.customerId))
          .limit(1);
        if (!account) {
          return { account: null, aging: null };
        }

        const entries = await db
          .select()
          .from(polimPothaEntries)
          .where(eq(polimPothaEntries.customerId, args.customerId))
          .orderBy(asc(polimPothaEntries.createdAt));

        const aging = computePolimAgingFromEntries(entries);

        return {
          account: {
            customerId: account.customerId,
            creditLimit: Number(account.creditLimit),
            balance: Number(account.currentBalance),
            availableCredit: Math.max(0, Number(account.creditLimit) - Number(account.currentBalance)),
            status: account.status,
          },
          aging,
        };
      },
    });

    // 3. DRAFT: Draft Purchase Order
    this.registerTool({
      name: 'draft_purchase_order',
      description: 'Draft a purchase order for supplier restocking. Requires approval before staff follow-up.',
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

    this.registerTool({
      name: 'draft_promotion',
      description: 'Draft a storefront promotion (discount code or banner copy) for marketing review.',
      risk: 'DRAFT',
      requiredRole: ['OWNER', 'ADMIN', 'MARKETING'],
      execute: async (
        args: { name: string; code?: string; discountPercent?: number; bannerText?: string },
        context,
      ) => {
        return {
          draftPromotionId: `DRAFT-PROMO-${Date.now()}`,
          name: args.name,
          code: args.code || args.name.toUpperCase().replace(/\s+/g, '-').slice(0, 12),
          discountPercent: args.discountPercent ?? 10,
          bannerText: args.bannerText || `${args.name} — limited time offer`,
          status: 'DRAFT_CREATED',
          createdBy: context.userId,
        };
      },
    });

    this.registerTool({
      name: 'draft_whatsapp_message',
      description: 'Draft a WhatsApp broadcast message for customer outreach. Requires approval before send.',
      risk: 'DRAFT',
      requiredRole: ['OWNER', 'ADMIN', 'MARKETING'],
      execute: async (
        args: { audience: string; message: string; templateName?: string },
        context,
      ) => {
        return {
          draftMessageId: `DRAFT-WA-${Date.now()}`,
          audience: args.audience,
          message: args.message,
          templateName: args.templateName || 'custom_broadcast',
          status: 'DRAFT_CREATED',
          createdBy: context.userId,
        };
      },
    });

    this.registerTool({
      name: 'draft_creative_campaign',
      description: 'Draft a storefront creative campaign (hero + announcement). Requires approval to publish.',
      risk: 'DRAFT',
      requiredRole: ['OWNER', 'ADMIN', 'MARKETING'],
      execute: async (
        args: { title: string; productName?: string; commandId?: string; announcement?: string; productImageUrl?: string },
        context,
      ) => {
        return {
          draftCampaignId: `DRAFT-CRE-${Date.now()}`,
          title: args.title,
          productName: args.productName || args.title,
          commandId: args.commandId || 'clean-set',
          announcement: args.announcement || `New campaign: ${args.title}`,
          productImageUrl: args.productImageUrl,
          status: 'DRAFT_CREATED',
          createdBy: context.userId,
        };
      },
    });

    // 4. HIGH_RISK_WRITE: Propose Stock Transfer between Locations — DB-grounded
    this.registerTool({
      name: 'propose_stock_transfer',
      description: 'Execute an inter-branch or warehouse stock transfer. Requires explicit user confirmation.',
      risk: 'HIGH_RISK_WRITE',
      requiredRole: ['OWNER', 'ADMIN', 'MANAGER'],
      execute: async (
        args: {
          fromLocationId: string;
          toLocationId: string;
          fromLocationType?: 'WAREHOUSE' | 'BRANCH';
          toLocationType?: 'WAREHOUSE' | 'BRANCH';
          items: Array<{ productId: string; quantity: number; variantId?: string }>;
        },
        context,
      ) => {
        const fromType = args.fromLocationType || 'WAREHOUSE';
        const toType = args.toLocationType || 'BRANCH';
        const transferNumber = `TRF-${Date.now()}`;
        const actorId = context.userId && !isDemoUserId(context.userId) ? context.userId : null;

        const result = await db.transaction(async (tx) => {
          const [tr] = await tx
            .insert(transfers)
            .values({
              transferNumber,
              fromLocationType: fromType,
              fromLocationId: args.fromLocationId,
              toLocationType: toType,
              toLocationId: args.toLocationId,
              status: 'RECEIVED',
              requestedBy: actorId,
              receivedBy: actorId,
            })
            .returning();

          for (const item of args.items) {
            const qty = Number(item.quantity);
            if (!qty || qty < 1) throw new Error('Invalid transfer quantity');

            await recordTransfer(
              tx,
              { locationType: fromType, locationId: args.fromLocationId },
              { locationType: toType, locationId: args.toLocationId },
              { productId: item.productId, variantId: item.variantId || null, quantity: qty },
              {
                referenceType: 'TRANSFER',
                referenceId: tr.id,
                actorId,
              },
            );

            await tx.insert(transferLines).values({
              transferId: tr.id,
              productId: item.productId,
              variantId: item.variantId || null,
              quantity: qty,
              receivedQty: qty,
              varianceQty: 0,
            });
          }

          if (actorId) {
            await tx.insert(auditLogs).values({
              actorId,
              action: 'JARVIS_STOCK_TRANSFER',
              entity: 'TRANSFER',
              entityId: tr.id,
              afterState: { transferNumber, from: args.fromLocationId, to: args.toLocationId, items: args.items },
            });
          }

          return tr;
        });

        return { status: 'TRANSFER_COMPLETED', transferId: result.id, transferNumber: result.transferNumber };
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

    // Safe execution for READ and LOW_RISK_WRITE
    if (tool.risk === 'READ' || tool.risk === 'LOW_RISK_WRITE') {
      try {
        const data = await tool.execute(args, context);
        return { toolName, risk: tool.risk, status: 'EXECUTED', data };
      } catch (err: any) {
        return { toolName, risk: tool.risk, status: 'ERROR', errorMessage: err.message };
      }
    }

    // DRAFT: preview + approval queue (JAR-03)
    if (tool.risk === 'DRAFT') {
      try {
        const preview = await tool.execute(args, context);
        const token = `DRAFT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        this.pendingConfirmations.set(token, {
          tool,
          args,
          context,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });

        await createApproval({
          token,
          toolName,
          description: tool.description,
          risk: 'DRAFT',
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
          data: preview,
          confirmationDetails: {
            actionDescription: tool.description,
            affectedEntities: Object.keys(args),
            riskSummary: 'Draft saved to Approvals — confirm to mark ready for staff execution.',
            payload: args,
          },
        };
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
    let pending = this.pendingConfirmations.get(token);
    if (!pending) {
      const approval = await findApprovalByToken(token);
      if (approval) {
        const tool = this.tools.get(approval.toolName);
        if (tool) {
          pending = {
            tool,
            args: approval.payload,
            context: {
              userId: approval.requestedBy,
              userName: 'Staff',
              role: approval.role as JarvisUserContext['role'],
              assignedBranchIds: [],
              assignedWarehouseIds: [],
            },
            expiresAt: new Date(approval.expiresAt).getTime(),
          };
        }
      }
    }

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
      const data =
        pending.tool.risk === 'DRAFT'
          ? await executeJarvisDraftApproval(pending.tool.name, pending.args as Record<string, unknown>, pending.context)
          : await pending.tool.execute(pending.args, pending.context);
      await writeJarvisExecutionAudit({
        toolName: pending.tool.name,
        risk: pending.tool.risk,
        actorId: pending.context.userId,
        actorRole: pending.context.role,
        token,
        payload: pending.args,
        result: data,
      });
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

async function writeJarvisExecutionAudit(input: {
  toolName: string;
  risk: JarvisActionRisk;
  actorId: string;
  actorRole: string;
  token: string;
  payload: unknown;
  result: unknown;
}) {
  if (!hasDatabaseUrl()) return;
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  try {
    await db.insert(auditLogs).values({
      actorId: uuidLike.test(input.actorId) ? input.actorId : null,
      actorRole: input.actorRole,
      action: 'JARVIS_TOOL_EXECUTE',
      entity: 'JARVIS_APPROVAL',
      entityId: input.token,
      riskLevel: input.risk,
      afterState: {
        toolName: input.toolName,
        payload: input.payload,
        result: input.result,
      },
    });
  } catch {
    /* audit is best-effort */
  }
}
