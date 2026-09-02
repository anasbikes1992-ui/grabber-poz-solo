import { and, eq, lte, sql } from 'drizzle-orm';
import { db, jobOutbox } from '@/db';

export type JobType =
  | 'WHATSAPP_SEND'
  | 'WHATSAPP_BROADCAST'
  | 'META_CAPI'
  | 'AUTOMATION_RETRY'
  | 'AGENT_BRIEF'
  | 'HP_REMINDER'
  | 'RECONCILE_STOCK'
  | 'QUOTE_RESERVATION_EXPIRE'
  | 'NEAR_EXPIRY_PROMO'
  | 'DRAFT_PO'
  | 'CHECKOUT_ABANDON';

export type EnqueueInput = {
  type: JobType;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  scheduledAt?: Date;
  maxAttempts?: number;
};

const BACKOFF_MS = [60_000, 120_000, 300_000, 600_000, 1_800_000];

export async function enqueueJob(input: EnqueueInput) {
  try {
    const [row] = await db
      .insert(jobOutbox)
      .values({
        type: input.type,
        idempotencyKey: input.idempotencyKey,
        payloadJson: input.payload,
        scheduledAt: input.scheduledAt || new Date(),
        maxAttempts: input.maxAttempts ?? 5,
      })
      .onConflictDoNothing()
      .returning();
    return { enqueued: Boolean(row), job: row || null };
  } catch {
    return { enqueued: false, job: null };
  }
}

export async function claimBatch(workerId: string, limit = 10) {
  const now = new Date();
  const candidates = await db
    .select()
    .from(jobOutbox)
    .where(and(eq(jobOutbox.status, 'PENDING'), lte(jobOutbox.scheduledAt, now)))
    .orderBy(jobOutbox.scheduledAt)
    .limit(limit);

  const claimed = [];
  for (const job of candidates) {
    const [locked] = await db
      .update(jobOutbox)
      .set({ status: 'PROCESSING', lockedAt: now, lockedBy: workerId })
      .where(and(eq(jobOutbox.id, job.id), eq(jobOutbox.status, 'PENDING')))
      .returning();
    if (locked) claimed.push(locked);
  }
  return claimed;
}

export async function markComplete(jobId: string) {
  await db
    .update(jobOutbox)
    .set({ status: 'COMPLETED', completedAt: new Date(), lockedAt: null, lockedBy: null })
    .where(eq(jobOutbox.id, jobId));
}

export async function markFailed(jobId: string, error: string, attempts: number, maxAttempts: number) {
  const nextAttempts = attempts + 1;
  if (nextAttempts >= maxAttempts) {
    await db
      .update(jobOutbox)
      .set({
        status: 'DEAD',
        attempts: nextAttempts,
        lastError: error.slice(0, 2000),
        lockedAt: null,
        lockedBy: null,
      })
      .where(eq(jobOutbox.id, jobId));
    return;
  }
  const delay = BACKOFF_MS[Math.min(nextAttempts - 1, BACKOFF_MS.length - 1)];
  await db
    .update(jobOutbox)
    .set({
      status: 'PENDING',
      attempts: nextAttempts,
      lastError: error.slice(0, 2000),
      scheduledAt: new Date(Date.now() + delay),
      lockedAt: null,
      lockedBy: null,
    })
    .where(eq(jobOutbox.id, jobId));
}

export async function listDeadJobs(limit = 50) {
  return db.select().from(jobOutbox).where(eq(jobOutbox.status, 'DEAD')).orderBy(sql`${jobOutbox.createdAt} DESC`).limit(limit);
}

export async function retryDeadJob(jobId: string) {
  await db
    .update(jobOutbox)
    .set({
      status: 'PENDING',
      attempts: 0,
      scheduledAt: new Date(),
      lastError: null,
    })
    .where(and(eq(jobOutbox.id, jobId), eq(jobOutbox.status, 'DEAD')));
}
