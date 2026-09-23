import { readConfigJson } from '@/lib/config/business-settings';
import { createEinvoiceDraft, queueEinvoiceSubmission, submitEinvoice } from '@/lib/compliance/einvoice';
import { enqueueJob } from '@/lib/jobs/outbox';

/**
 * Fire-and-forget after paid checkout. Never throws into commerce.
 * Enable via business_config.configJson.featureFlags.autoEinvoice = true
 * or env AUTO_EINVOICE=1
 */
export async function maybeAutoEinvoiceOnPaidOrder(orderNumber: string, paymentStatus: string) {
  try {
    if (String(paymentStatus).toUpperCase() !== 'PAID') return;
    const envOn = process.env.AUTO_EINVOICE === '1' || process.env.AUTO_EINVOICE === 'true';
    const cfg = await readConfigJson().catch(() => ({} as Record<string, unknown>));
    const flags = (cfg.featureFlags || {}) as Record<string, unknown>;
    if (!envOn && !flags.autoEinvoice) return;

    const draft = await createEinvoiceDraft(orderNumber, null);
    const queued = await queueEinvoiceSubmission(draft.id);
    await enqueueJob({
      type: 'EINVOICE_SUBMIT',
      idempotencyKey: `auto-einvoice-${orderNumber}`,
      payload: { id: queued.id },
    });
    // Best-effort immediate submit if cron is slow
    if (process.env.EINVOICE_PROVIDER_URL || process.env.AUTO_EINVOICE_SUBMIT_NOW === '1') {
      await submitEinvoice(queued.id).catch(() => undefined);
    }
  } catch {
    // never break checkout
  }
}
