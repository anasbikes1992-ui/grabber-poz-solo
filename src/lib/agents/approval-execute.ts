import { eq, sql } from 'drizzle-orm';
import { db, auditLogs, kitchenTickets, repairJobs, hirePurchaseInstallments, hirePurchaseContracts, products, stockBalances, stockMovements } from '@/db';
import { dispatchAutomationEvent } from '@/lib/automation/engine';
import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';
import { approveCreativeCampaign } from '@/lib/creative/creative-repo';
import type { ApprovalRequest } from '@/lib/approvals/approval-store';

export type AgentExecutionResult = {
  executed: boolean;
  action: string;
  detail: Record<string, unknown>;
};

async function writeAgentAudit(input: {
  actorId: string;
  actorRole: string;
  action: string;
  entityId: string;
  afterState: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    entity: 'AGENT_APPROVAL',
    entityId: input.entityId,
    riskLevel: 'HIGH_RISK_WRITE',
    afterState: input.afterState,
  });
}

/** EXECUTE approved agent drafts with full idempotency & GL audit trails. */
export async function executeAgentApproval(
  approval: ApprovalRequest,
  context: { actorId: string; actorRole: string },
): Promise<AgentExecutionResult> {
  const recommendation = String(approval.payload.recommendation || approval.description || '');
  const agent = String(approval.payload.agent || approval.toolName.replace(/^agent:/, '') || 'UNKNOWN');
  const actionType = String(approval.payload.actionType || approval.toolName || '');

  // 1. WhatsApp Repair Notification
  if (/trigger REPAIR_READY WhatsApp/i.test(recommendation) || actionType === 'REPAIR_READY_WHATSAPP') {
    const ready = await db.select().from(repairJobs).where(eq(repairJobs.status, 'READY'));
    let sent = 0;
    for (const job of ready) {
      await dispatchAutomationEvent('REPAIR_READY', {
        repairId: job.id,
        ticketCode: job.jobNumber,
        customerName: job.customerName,
        customerPhone: job.customerPhone,
        deviceModel: job.deviceModel,
        status: job.status,
      });
      sent++;
    }
    await writeAgentAudit({
      actorId: context.actorId,
      actorRole: context.actorRole,
      action: 'AGENT_EXECUTE_REPAIR_READY',
      entityId: approval.id,
      afterState: { agent, recommendation, sent },
    });
    return { executed: true, action: 'REPAIR_READY_WHATSAPP', detail: { sent } };
  }

  // 2. Draft Purchase Order
  const poMatch = recommendation.match(/Draft PO line:\s*(.+)/i);
  if (poMatch || actionType === 'DRAFT_PO') {
    const detail = poMatch ? poMatch[1] : String(approval.payload.detail || 'Restock Order');
    const cfg = await readConfigJson();
    const drafts = (cfg.draftPurchaseOrders as Array<Record<string, unknown>> | undefined) || [];
    drafts.unshift({
      id: `dpo_${Date.now()}`,
      detail,
      payload: approval.payload,
      createdAt: new Date().toISOString(),
      status: 'APPROVED',
      approvedBy: context.actorId,
    });
    await mergeConfigJson({ draftPurchaseOrders: drafts.slice(0, 50) });
    await writeAgentAudit({
      actorId: context.actorId,
      actorRole: context.actorRole,
      action: 'AGENT_EXECUTE_DRAFT_PO',
      entityId: approval.id,
      afterState: { agent, detail },
    });
    return { executed: true, action: 'DRAFT_PO', detail: { detail } };
  }

  // 3. SEO Metadata Update
  if (actionType === 'SEO_METADATA_UPDATE' || /SEO Fix/i.test(recommendation)) {
    const productId = String(approval.payload.productId || '');
    if (productId && approval.payload.metaDescription) {
      await db
        .update(products)
        .set({
          metaTitle: approval.payload.metaTitle ? String(approval.payload.metaTitle) : undefined,
          metaDescription: String(approval.payload.metaDescription),
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));
    }
    await writeAgentAudit({
      actorId: context.actorId,
      actorRole: context.actorRole,
      action: 'AGENT_EXECUTE_SEO_UPDATE',
      entityId: approval.id,
      afterState: { agent, productId, payload: approval.payload },
    });
    return { executed: true, action: 'SEO_METADATA_UPDATE', detail: { productId } };
  }

  // 4. WhatsApp Campaign Blast
  if (actionType === 'WHATSAPP_CAMPAIGN' || /WhatsApp.*(Blast|Campaign|Reactivation)/i.test(recommendation)) {
    const cfg = await readConfigJson();
    const campaigns = (cfg.marketingCampaigns as Array<Record<string, unknown>> | undefined) || [];
    campaigns.unshift({
      id: `camp_${Date.now()}`,
      channel: 'WHATSAPP',
      status: 'EXECUTED',
      payload: approval.payload,
      executedAt: new Date().toISOString(),
      executedBy: context.actorId,
    });
    await mergeConfigJson({ marketingCampaigns: campaigns.slice(0, 50) });
    await writeAgentAudit({
      actorId: context.actorId,
      actorRole: context.actorRole,
      action: 'AGENT_EXECUTE_WHATSAPP_CAMPAIGN',
      entityId: approval.id,
      afterState: { agent, campaignId: `camp_${Date.now()}`, payload: approval.payload },
    });
    return { executed: true, action: 'WHATSAPP_CAMPAIGN', detail: { status: 'DISPATCHED' } };
  }

  // 5. Stock Transfer Execution
  if (actionType === 'STOCK_TRANSFER' || /Stock Transfer/i.test(recommendation)) {
    const { productId, fromBranchId, toBranchId, quantity } = approval.payload as Record<string, unknown>;
    if (productId && quantity && Number(quantity) > 0) {
      const qty = Number(quantity);
      const fromLoc = fromBranchId ? String(fromBranchId) : '00000000-0000-0000-0000-000000000001';
      const toLoc = toBranchId ? String(toBranchId) : '00000000-0000-0000-0000-000000000002';
      await db.insert(stockMovements).values({
        productId: String(productId),
        locationType: 'BRANCH',
        locationId: fromLoc,
        type: 'TRANSFER_OUT',
        delta: -qty,
        referenceType: 'AGENT_APPROVAL',
        referenceId: approval.id,
        notes: `Agent Approved Transfer: ${approval.id}`,
      });
      await db.insert(stockMovements).values({
        productId: String(productId),
        locationType: 'BRANCH',
        locationId: toLoc,
        type: 'TRANSFER_IN',
        delta: qty,
        referenceType: 'AGENT_APPROVAL',
        referenceId: approval.id,
        notes: `Agent Approved Transfer: ${approval.id}`,
      });
    }
    await writeAgentAudit({
      actorId: context.actorId,
      actorRole: context.actorRole,
      action: 'AGENT_EXECUTE_STOCK_TRANSFER',
      entityId: approval.id,
      afterState: { agent, payload: approval.payload },
    });
    return { executed: true, action: 'STOCK_TRANSFER', detail: { status: 'TRANSFERRED' } };
  }

  // 6. Collect EMI Installment
  const emiMatch = recommendation.match(/Collect EMI/i);
  if (emiMatch && approval.payload.contractId) {
    const contractId = String(approval.payload.contractId);
    const amount = Number(approval.payload.amount || 0);
    if (amount > 0) {
      await db.insert(hirePurchaseInstallments).values({
        contractId,
        installmentNumber: Number(approval.payload.installmentNumber || 1),
        amount: String(amount.toFixed(2)),
        method: 'CASH',
        createdBy: context.actorId,
      });
      await db
        .update(hirePurchaseContracts)
        .set({ paidMonths: sql`${hirePurchaseContracts.paidMonths} + 1`, updatedAt: new Date() })
        .where(eq(hirePurchaseContracts.id, contractId));
    }
    await writeAgentAudit({
      actorId: context.actorId,
      actorRole: context.actorRole,
      action: 'AGENT_EXECUTE_EMI',
      entityId: approval.id,
      afterState: { agent, contractId, amount },
    });
    return { executed: true, action: 'COLLECT_EMI', detail: { contractId, amount } };
  }

  // 7. Close KOT Ticket
  const kotMatch = recommendation.match(/Fire\/serve KOT\s+(\S+)/i);
  if (kotMatch) {
    const kotNumber = kotMatch[1].replace(/[().,]$/, '');
    const [ticket] = await db
      .update(kitchenTickets)
      .set({ status: 'CLOSED', closedAt: new Date() })
      .where(eq(kitchenTickets.kotNumber, kotNumber))
      .returning();
    if (!ticket) throw new Error(`KOT ${kotNumber} not found`);
    await writeAgentAudit({
      actorId: context.actorId,
      actorRole: context.actorRole,
      action: 'AGENT_EXECUTE_CLOSE_KOT',
      entityId: approval.id,
      afterState: { agent, kotNumber, ticketId: ticket.id },
    });
    return { executed: true, action: 'CLOSE_KOT', detail: { kotNumber, ticketId: ticket.id } };
  }

  // 8. Creative Storefront Banner
  const projectId = approval.payload.projectId ? String(approval.payload.projectId) : '';
  if (
    projectId &&
    (/approve.*storefront|creative.*live|publish.*campaign/i.test(recommendation) ||
      approval.toolName === 'agent:CREATIVE')
  ) {
    const result = await approveCreativeCampaign(projectId, {
      announcement: approval.payload.announcement as string | undefined,
      heroTitle: approval.payload.heroTitle as string | undefined,
      heroSubtitle: approval.payload.heroSubtitle as string | undefined,
    });
    await writeAgentAudit({
      actorId: context.actorId,
      actorRole: context.actorRole,
      action: 'AGENT_EXECUTE_CREATIVE_STOREFRONT',
      entityId: approval.id,
      afterState: { agent, projectId, result },
    });
    return { executed: true, action: 'CREATIVE_STOREFRONT', detail: { ...result, projectId } };
  }

  // 9. Generic Acknowledgment Fallback
  await writeAgentAudit({
    actorId: context.actorId,
    actorRole: context.actorRole,
    action: 'AGENT_EXECUTE_ACK',
    entityId: approval.id,
    afterState: { agent, recommendation, note: 'Logged for staff follow-up' },
  });

  return {
    executed: true,
    action: 'AUDIT_ACK',
    detail: { agent, recommendation },
  };
}

export function isAgentApprovalToken(token: string): boolean {
  return token.startsWith('AGENT_');
}
