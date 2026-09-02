import { enqueueJob } from '@/lib/jobs/outbox';
import { hasDatabaseUrl } from '@/db';

/** Idempotent daily/periodic job enqueue — safe to call every cron tick. */
export async function ensurePeriodicJobs() {
  if (!hasDatabaseUrl()) return { enqueued: 0 };

  const dayKey = new Date().toISOString().slice(0, 10);
  const jobs = [
    { type: 'HP_REMINDER' as const, key: `hp_reminder_${dayKey}` },
    { type: 'RECONCILE_STOCK' as const, key: `reconcile_stock_${dayKey}` },
    { type: 'NEAR_EXPIRY_PROMO' as const, key: `near_expiry_${dayKey}` },
    { type: 'AGENT_BRIEF' as const, key: `agent_brief_${dayKey}` },
  ];

  let enqueued = 0;
  for (const job of jobs) {
    const result = await enqueueJob({
      type: job.type,
      idempotencyKey: job.key,
      payload: { scheduledDay: dayKey },
    });
    if (result.enqueued) enqueued += 1;
  }
  return { enqueued };
}
