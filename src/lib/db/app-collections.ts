/**
 * @deprecated LEGACY DATA PATH PURGED (Pass 2 Audit).
 * 
 * All production domain entities (damages, warranties, quotations) must use canonical
 * PostgreSQL tables in @/db/schema.ts. This helper is retained solely for legacy migration
 * read-only fallback and must NEVER be used as the primary source of truth.
 */

import { eq } from 'drizzle-orm';
import { db, businessConfig } from '@/db';

type CollectionsRoot = Record<string, Record<string, unknown>[]>;

async function readRoot(): Promise<{ id: string | null; collections: CollectionsRoot; config: Record<string, unknown> }> {
  const [row] = await db.select().from(businessConfig).limit(1);
  const config = (row?.configJson || {}) as Record<string, unknown>;
  const collections = (config.collections || {}) as CollectionsRoot;
  return { id: row?.id ?? null, collections, config };
}

export async function listLegacyCollection<T extends { id: string }>(name: string): Promise<T[]> {
  const { collections } = await readRoot();
  return (collections[name] || []) as T[];
}
