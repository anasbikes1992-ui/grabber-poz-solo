/**
 * Offline POS Queue & Client Sequence Helpers.
 * Fully backed by the persistent Odoo-class IndexedDB offline-engine.ts.
 */

import {
  recordOfflineSale,
  listPendingOfflineTransactions,
  synchronizeOfflineTransactions,
} from './offline-engine';

export * from './offline-engine';

const TERMINAL_KEY = 'grabber_pos_terminal_id';
const SEQ_KEY = 'grabber_pos_local_seq';

export function getTerminalId(): string {
  if (typeof window === 'undefined') return 'term_server';
  let term = localStorage.getItem(TERMINAL_KEY);
  if (!term) {
    term = `term_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(TERMINAL_KEY, term);
  }
  return term;
}

let inMemorySeq = 0;

export function nextClientSequence(): number {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    inMemorySeq += 1;
    return inMemorySeq;
  }
  const cur = parseInt(localStorage.getItem(SEQ_KEY) || '0', 10);
  const next = cur + 1;
  localStorage.setItem(SEQ_KEY, next.toString());
  return next;
}

export async function countPendingCheckouts(): Promise<number> {
  const pending = await listPendingOfflineTransactions();
  return pending.length;
}

export async function enqueueCheckout(payload: Record<string, unknown>): Promise<string> {
  const items = Array.isArray(payload.items) ? (payload.items as any[]) : [];
  const rec = await recordOfflineSale({
    id: payload.clientUuid as string | undefined,
    idempotencyKey: payload.idempotencyKey as string | undefined,
    deviceId: getTerminalId(),
    terminalId: getTerminalId(),
    registerId: payload.registerId as string | undefined,
    sessionId: payload.sessionId as string | undefined,
    cashierId: payload.cashierId as string | undefined,
    items,
    subtotal: Number(payload.subtotal || 0),
    discountTotal: Number(payload.discountTotal || 0),
    taxTotal: Number(payload.taxTotal || 0),
    grandTotal: Number(payload.grandTotal || 0),
    paymentMethod: (payload.paymentMethod as any) || 'CASH',
    payments: payload.payments as any,
    customerId: payload.customerId as string | undefined,
    customerName: payload.customerName as string | undefined,
    customerPhone: payload.customerPhone as string | undefined,
  });
  return rec.id;
}

export async function flushPendingCheckouts(): Promise<{
  flushed: number;
  failed: number;
  remaining: number;
  errors: string[];
  syncResults: Array<{ offlineId: string; status: string }>;
}> {
  const result = await synchronizeOfflineTransactions('');
  return {
    flushed: result.syncedCount,
    failed: result.failedCount,
    remaining: result.remainingCount,
    errors: result.results.filter((r) => r.status === 'FAILED').map((r) => r.error || 'Failed to sync'),
    syncResults: result.results.map((r) => ({ offlineId: r.id, status: r.status })),
  };
}
