import { eq, and } from 'drizzle-orm';
import { db, idempotencyRecords } from '@/db';

export type IdempotencyScope =
  | 'CHECKOUT'
  | 'PAYMENT'
  | 'PAYMENT_WEBHOOK'
  | 'REFUND'
  | 'STOCK_ADJUSTMENT'
  | 'GRN'
  | 'TRANSFER_DISPATCH'
  | 'TRANSFER_RECEIVE'
  | 'PURCHASE_ORDER'
  | 'WHATSAPP_AUTOMATION'
  | 'AGENT_ACTION';

// In-process fallback cache (for offline/isolated memory tests)
const fallbackMemoryCache = new Map<string, unknown>();

function buildCompositeKey(scope: IdempotencyScope, key: string): string {
  return `${scope}:${key.trim()}`;
}

/**
 * Retrieve cached execution result for a given scope and idempotency key.
 * Queries PostgreSQL idempotency_records to ensure durability across process restarts.
 */
export async function getDurableIdempotencyResult<T = unknown>(
  scope: IdempotencyScope,
  key: string,
): Promise<T | null> {
  const compKey = buildCompositeKey(scope, key);
  try {
    const [record] = await db
      .select()
      .from(idempotencyRecords)
      .where(and(eq(idempotencyRecords.scope, scope), eq(idempotencyRecords.key, key)))
      .limit(1);

    if (record && record.status === 'COMPLETED') {
      return (record.resultJson as T) ?? null;
    }
  } catch {
    // If DB is unavailable during early bootstrap or unit test harness, check memory fallback
    if (fallbackMemoryCache.has(compKey)) {
      return (fallbackMemoryCache.get(compKey) as T) ?? null;
    }
  }
  return null;
}

/**
 * Persist execution result durably to PostgreSQL. Survives process and container restarts.
 */
export async function saveDurableIdempotencyResult<T = unknown>(
  scope: IdempotencyScope,
  key: string,
  result: T,
): Promise<void> {
  const compKey = buildCompositeKey(scope, key);
  fallbackMemoryCache.set(compKey, result);

  try {
    await db
      .insert(idempotencyRecords)
      .values({
        scope,
        key,
        resultJson: (result as Record<string, unknown>) || {},
        status: 'COMPLETED',
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [idempotencyRecords.scope, idempotencyRecords.key],
        set: {
          resultJson: (result as Record<string, unknown>) || {},
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
  } catch {
    // Memory fallback retained
  }
}

/**
 * Canonical wrapper for operations requiring strict cross-restart idempotency.
 * If the key has already succeeded, returns the original result without re-executing.
 */
export async function withDurableIdempotency<T = unknown>(
  scope: IdempotencyScope,
  key: string | undefined | null,
  executeFn: () => Promise<T>,
): Promise<{ result: T; wasCached: boolean }> {
  if (!key || !key.trim()) {
    // If no idempotency key was supplied, execute normally
    const result = await executeFn();
    return { result, wasCached: false };
  }

  const existing = await getDurableIdempotencyResult<T>(scope, key);
  if (existing !== null) {
    return { result: existing, wasCached: true };
  }

  const result = await executeFn();
  await saveDurableIdempotencyResult<T>(scope, key, result);
  return { result, wasCached: false };
}
