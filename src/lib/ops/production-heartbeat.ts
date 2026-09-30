import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { backupRecords, jobOutbox, journalEntries, orders, payments, webhookEvents } from '@/db/schema';
import { db } from '@/db';

export type BackupFreshness = {
  status: 'OK' | 'STALE' | 'MISSING';
  latestAt: string | null;
  ageHours: number | null;
  maxAgeHours: number;
};

export type PaymentMismatch = {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  grandTotal: number;
  paidTotal: number;
  difference: number;
};

export type OpsHeartbeat = {
  generatedAt: string;
  backup: BackupFreshness;
  paymentMismatches: PaymentMismatch[];
  pendingJobs: number;
  deadJobs: number;
  failedWebhooks: number;
  staleOpenPaidOrders: number;
  recentJournalEntries: number;
};

const DEFAULT_BACKUP_MAX_AGE_HOURS = 26;
const MONEY_EPSILON = 0.01;

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function ageHours(date: Date): number {
  return Math.round(((Date.now() - date.getTime()) / 3_600_000) * 100) / 100;
}

export async function getBackupFreshness(maxAgeHours = DEFAULT_BACKUP_MAX_AGE_HOURS): Promise<BackupFreshness> {
  const [latest] = await db
    .select({ createdAt: backupRecords.createdAt })
    .from(backupRecords)
    .orderBy(desc(backupRecords.createdAt))
    .limit(1);

  if (!latest?.createdAt) {
    return { status: 'MISSING', latestAt: null, ageHours: null, maxAgeHours };
  }

  const age = ageHours(latest.createdAt);
  return {
    status: age <= maxAgeHours ? 'OK' : 'STALE',
    latestAt: latest.createdAt.toISOString(),
    ageHours: age,
    maxAgeHours,
  };
}

export async function findPaymentMismatches(limit = 50): Promise<PaymentMismatch[]> {
  const paidOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      paymentStatus: orders.paymentStatus,
      grandTotal: orders.grandTotal,
    })
    .from(orders)
    .where(eq(orders.paymentStatus, 'PAID'))
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  if (paidOrders.length === 0) return [];

  const orderIds = paidOrders.map((o) => o.id);
  const paymentRows = await db
    .select({
      orderId: payments.orderId,
      paidTotal: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'SUCCESS'), 0)`,
    })
    .from(payments)
    .where(inArray(payments.orderId, orderIds))
    .groupBy(payments.orderId);

  const paidByOrder = new Map(paymentRows.map((row) => [row.orderId, toNumber(row.paidTotal)]));

  return paidOrders
    .map((order) => {
      const grandTotal = toNumber(order.grandTotal);
      const paidTotal = paidByOrder.get(order.id) || 0;
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: String(order.paymentStatus),
        grandTotal,
        paidTotal,
        difference: Math.round((paidTotal - grandTotal) * 100) / 100,
      };
    })
    .filter((row) => {
      return Math.abs(row.difference) > MONEY_EPSILON;
    });
}

export async function getOpsHeartbeat(): Promise<OpsHeartbeat> {
  const [
    backup,
    paymentMismatches,
    [pendingJobs],
    [deadJobs],
    [failedWebhooks],
    [staleOpenPaidOrders],
    [recentJournalEntries],
  ] = await Promise.all([
    getBackupFreshness(),
    findPaymentMismatches(),
    db.select({ count: sql<number>`count(*)::int` }).from(jobOutbox).where(eq(jobOutbox.status, 'PENDING')),
    db.select({ count: sql<number>`count(*)::int` }).from(jobOutbox).where(eq(jobOutbox.status, 'DEAD')),
    db.select({ count: sql<number>`count(*)::int` }).from(webhookEvents).where(eq(webhookEvents.status, 'FAILED')),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.paymentStatus, 'PAID'), inArray(orders.orderStatus, ['DRAFT', 'CONFIRMED']))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(journalEntries)
      .where(sql`${journalEntries.createdAt} >= now() - interval '24 hours'`),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    backup,
    paymentMismatches,
    pendingJobs: pendingJobs?.count || 0,
    deadJobs: deadJobs?.count || 0,
    failedWebhooks: failedWebhooks?.count || 0,
    staleOpenPaidOrders: staleOpenPaidOrders?.count || 0,
    recentJournalEntries: recentJournalEntries?.count || 0,
  };
}

export function summarizeHeartbeat(heartbeat: OpsHeartbeat) {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (heartbeat.backup.status === 'MISSING') failures.push('No backup record exists.');
  if (heartbeat.backup.status === 'STALE') failures.push(`Latest backup is ${heartbeat.backup.ageHours}h old.`);
  if (heartbeat.paymentMismatches.length > 0) failures.push(`${heartbeat.paymentMismatches.length} paid order(s) do not match successful payment totals.`);
  if (heartbeat.deadJobs > 0) failures.push(`${heartbeat.deadJobs} dead background job(s).`);
  if (heartbeat.failedWebhooks > 0) failures.push(`${heartbeat.failedWebhooks} failed webhook event(s).`);
  if (heartbeat.staleOpenPaidOrders > 0) warnings.push(`${heartbeat.staleOpenPaidOrders} paid order(s) are still draft/confirmed.`);

  return {
    ok: failures.length === 0,
    status: failures.length === 0 ? (warnings.length === 0 ? 'OK' : 'WARN') : 'FAIL',
    failures,
    warnings,
  };
}
