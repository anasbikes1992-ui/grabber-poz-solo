import { eq, inArray } from 'drizzle-orm';
import { db, hirePurchaseContracts } from '@/db';
import { computeHirePurchaseArrears } from '@/lib/hire-purchase/arrears';
import { enqueueJob } from '@/lib/jobs/outbox';

/** T-3 reminder, T+1 warning, T+15 late fee draft via job queue. */
export async function processHpReminders() {
  const contracts = await db
    .select()
    .from(hirePurchaseContracts)
    .where(inArray(hirePurchaseContracts.status, ['ACTIVE', 'OVERDUE', 'LOCKED']));

  for (const c of contracts) {
    const arrears = computeHirePurchaseArrears(c);
    if (arrears.daysPastDue <= 0) continue;

    const phone = c.phone.replace(/\D/g, '');
    if (!phone) continue;

    if (arrears.daysPastDue === 1) {
      await enqueueJob({
        type: 'WHATSAPP_SEND',
        idempotencyKey: `hp_warn_${c.id}_${arrears.daysPastDue}`,
        payload: {
          to: phone,
          text: `Reminder: EMI overdue for ${c.itemName}. Contract ${c.contractNumber}. Please contact us to arrange payment.`,
        },
      });
    } else if (arrears.daysPastDue >= 15 && c.status !== 'LOCKED') {
      await db
        .update(hirePurchaseContracts)
        .set({
          status: 'LOCKED',
          lateFeeAccrued: String((Number(c.lateFeeAccrued) + Number(c.monthlyEmi) * 0.05).toFixed(2)),
          updatedAt: new Date(),
        })
        .where(eq(hirePurchaseContracts.id, c.id));
      await enqueueJob({
        type: 'WHATSAPP_SEND',
        idempotencyKey: `hp_late_${c.id}`,
        payload: {
          to: phone,
          text: `Late fee applied on contract ${c.contractNumber}. Account locked until settlement. Call us to resolve.`,
        },
      });
    } else if (arrears.daysPastDue <= 3) {
      await enqueueJob({
        type: 'WHATSAPP_SEND',
        idempotencyKey: `hp_remind_${c.id}_${new Date().toISOString().slice(0, 10)}`,
        payload: {
          to: phone,
          text: `Friendly reminder: EMI due soon for ${c.itemName} (${c.contractNumber}).`,
        },
      });
    }
  }
}

export async function scheduleHpReminderCron() {
  await enqueueJob({
    type: 'HP_REMINDER',
    idempotencyKey: `hp_cron_${new Date().toISOString().slice(0, 10)}`,
    payload: {},
  });
}
