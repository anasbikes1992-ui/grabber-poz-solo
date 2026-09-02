import { sendWhatsAppText } from '@/lib/integrations/whatsapp';
import { sendMetaPurchaseEvent } from '@/lib/integrations/meta-capi';
import { retryFailedAutomationLog } from '@/lib/automation/engine';
import { runAllEnabledAgentsBrief } from '@/lib/agents/orchestrator';
import { reconcileStockDrift } from '@/lib/inventory/stock-service';
import { releaseStock } from '@/lib/inventory/stock-reservation';
import { processHpReminders } from '@/lib/hire-purchase/escalation';
import { suggestNearExpiryPromos } from '@/lib/inventory/near-expiry';
import type { JobType } from './outbox';

export async function handleJob(type: JobType, payload: Record<string, unknown>): Promise<void> {
  switch (type) {
    case 'WHATSAPP_SEND': {
      const to = String(payload.to || '');
      const text = String(payload.text || '');
      const result = await sendWhatsAppText({ to, text });
      if (!result.success) throw new Error(result.error || 'WhatsApp send failed');
      break;
    }
    case 'WHATSAPP_BROADCAST': {
      const recipients = (payload.recipients as string[]) || [];
      const text = String(payload.text || '');
      for (const to of recipients) {
        const result = await sendWhatsAppText({ to, text });
        if (!result.success) throw new Error(result.error || `Broadcast failed for ${to}`);
      }
      break;
    }
    case 'META_CAPI': {
      await sendMetaPurchaseEvent({
        orderNumber: String(payload.orderNumber || ''),
        value: Number(payload.value || 0),
        email: payload.email as string | null | undefined,
        phone: payload.phone as string | undefined,
      });
      break;
    }
    case 'AUTOMATION_RETRY': {
      const logId = String(payload.logId || '');
      const ok = await retryFailedAutomationLog(logId);
      if (!ok) throw new Error('Automation retry failed');
      break;
    }
    case 'AGENT_BRIEF': {
      await runAllEnabledAgentsBrief();
      break;
    }
    case 'HP_REMINDER': {
      await processHpReminders();
      break;
    }
    case 'RECONCILE_STOCK': {
      await reconcileStockDrift();
      break;
    }
    case 'QUOTE_RESERVATION_EXPIRE': {
      const lines = (payload.lines as Array<{ productId: string; variantId?: string; qty: number }>) || [];
      const quoteId = String(payload.quoteId || '');
      for (const line of lines) {
        await releaseStock({
          productId: line.productId,
          variantId: line.variantId,
          qty: line.qty,
          referenceType: 'QUOTATION',
          referenceId: quoteId,
        }).catch(() => undefined);
      }
      break;
    }
    case 'NEAR_EXPIRY_PROMO': {
      await suggestNearExpiryPromos();
      break;
    }
    case 'DRAFT_PO': {
      // Inventory agent proposes; job ack only until approval execute wired
      break;
    }
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}
