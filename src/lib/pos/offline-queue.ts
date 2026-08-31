/**
 * Browser IndexedDB queue for offline POS checkouts.
 * Flushes via POST /api/pos/checkout with clientUuid / idempotencyKey.
 */

const DB_NAME = 'grabber-pos-offline';
const STORE = 'checkout_queue';
const DB_VERSION = 1;

export type QueuedCheckout = {
  id: string;
  createdAt: number;
  payload: Record<string, unknown>;
  attempts: number;
  lastError?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IDB open failed'));
  });
}

export async function enqueueCheckout(payload: Record<string, unknown>): Promise<string> {
  const id =
    (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
    `off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row: QueuedCheckout = {
    id,
    createdAt: Date.now(),
    payload: {
      ...payload,
      clientUuid: payload.clientUuid || id,
      idempotencyKey: payload.idempotencyKey || `offline_${id}`,
    },
    attempts: 0,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

export async function listQueuedCheckouts(): Promise<QueuedCheckout[]> {
  const db = await openDb();
  const rows = await new Promise<QueuedCheckout[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedCheckout[]) || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function countPendingCheckouts(): Promise<number> {
  const rows = await listQueuedCheckouts();
  return rows.length;
}

export async function removeQueuedCheckout(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function flushCheckoutQueue(): Promise<{
  flushed: number;
  failed: number;
  remaining: number;
  errors: string[];
}> {
  const queue = await listQueuedCheckouts();
  let flushed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of queue) {
    try {
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row.payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Checkout sync failed');
      await removeQueuedCheckout(row.id);
      flushed += 1;
    } catch (err: unknown) {
      failed += 1;
      errors.push(`${row.id}: ${(err as Error).message}`);
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({
          ...row,
          attempts: row.attempts + 1,
          lastError: (err as Error).message,
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }
  }

  const remaining = await countPendingCheckouts();
  return { flushed, failed, remaining, errors };
}

/** Alias used by POS UI */
export const flushPendingCheckouts = flushCheckoutQueue;
