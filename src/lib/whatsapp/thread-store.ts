/**
 * Persisted WhatsApp inbox threads (GRW-09).
 */
import { desc, eq } from 'drizzle-orm';
import { db, customers, whatsappMessages, whatsappThreads } from '@/db';

function normalizePhone(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

export async function appendWhatsAppMessage(input: {
  phone: string;
  direction: 'IN' | 'OUT';
  body: string;
  providerMessageId?: string | null;
  status?: string;
}) {
  const phone = normalizePhone(input.phone);
  if (!phone || !input.body?.trim()) return null;

  let [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);
  if (!customer) {
    const withPlus = `+${phone}`;
    [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.phone, withPlus))
      .limit(1);
  }

  let [thread] = await db.select().from(whatsappThreads).where(eq(whatsappThreads.phone, phone)).limit(1);
  const preview = input.body.slice(0, 160);
  const now = new Date();

  if (!thread) {
    [thread] = await db
      .insert(whatsappThreads)
      .values({
        phone,
        customerId: customer?.id ?? null,
        lastMessageAt: now,
        lastPreview: preview,
        unreadCount: input.direction === 'IN' ? 1 : 0,
      })
      .returning();
  } else {
    [thread] = await db
      .update(whatsappThreads)
      .set({
        lastMessageAt: now,
        lastPreview: preview,
        customerId: thread.customerId || customer?.id || null,
        unreadCount: input.direction === 'IN' ? (thread.unreadCount || 0) + 1 : thread.unreadCount,
        updatedAt: now,
      })
      .where(eq(whatsappThreads.id, thread.id))
      .returning();
  }

  const [msg] = await db
    .insert(whatsappMessages)
    .values({
      threadId: thread.id,
      direction: input.direction,
      body: input.body.slice(0, 4000),
      providerMessageId: input.providerMessageId || null,
      status: input.status || (input.direction === 'OUT' ? 'SENT' : 'RECEIVED'),
    })
    .returning();

  return { thread, message: msg };
}

export async function listWhatsAppThreads(limit = 50) {
  return db
    .select()
    .from(whatsappThreads)
    .orderBy(desc(whatsappThreads.lastMessageAt))
    .limit(limit);
}

export async function listWhatsAppMessages(threadId: string, limit = 100) {
  return db
    .select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.threadId, threadId))
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(limit)
    .then((rows) => rows.reverse());
}

export async function markThreadRead(threadId: string) {
  await db
    .update(whatsappThreads)
    .set({ unreadCount: 0, updatedAt: new Date() })
    .where(eq(whatsappThreads.id, threadId));
}

export async function getThreadByPhone(phone: string) {
  const p = normalizePhone(phone);
  const [thread] = await db.select().from(whatsappThreads).where(eq(whatsappThreads.phone, p)).limit(1);
  return thread ?? null;
}

export async function getOrCreateThreadByPhone(phone: string) {
  const existing = await getThreadByPhone(phone);
  if (existing) return existing;
  const p = normalizePhone(phone);
  const [created] = await db
    .insert(whatsappThreads)
    .values({ phone: p, lastMessageAt: new Date(), lastPreview: '', unreadCount: 0 })
    .returning();
  return created;
}
