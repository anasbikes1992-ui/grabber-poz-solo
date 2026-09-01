import { eq } from 'drizzle-orm';
import { db, businessConfig } from '@/db';

type CollectionsRoot = Record<string, Record<string, unknown>[]>;

async function readRoot(): Promise<{ id: string | null; collections: CollectionsRoot; config: Record<string, unknown> }> {
  const [row] = await db.select().from(businessConfig).limit(1);
  const config = (row?.configJson || {}) as Record<string, unknown>;
  const collections = (config.collections || {}) as CollectionsRoot;
  return { id: row?.id ?? null, collections, config };
}

async function writeCollections(id: string, config: Record<string, unknown>, collections: CollectionsRoot) {
  await db
    .update(businessConfig)
    .set({
      configJson: { ...config, collections },
      updatedAt: new Date(),
    })
    .where(eq(businessConfig.id, id));
}

export async function listCollection<T extends { id: string }>(name: string): Promise<T[]> {
  const { collections } = await readRoot();
  return (collections[name] || []) as T[];
}

export async function upsertCollectionItem<T extends { id: string }>(name: string, item: T): Promise<T> {
  const { id, collections, config } = await readRoot();
  if (!id) {
    await db.insert(businessConfig).values({
      configJson: { collections: { [name]: [item] } },
    });
    return item;
  }
  const list = ((collections[name] || []) as T[]).filter((x) => x.id !== item.id);
  list.unshift(item);
  await writeCollections(id, config, { ...collections, [name]: list });
  return item;
}

export async function deleteCollectionItem(name: string, itemId: string): Promise<boolean> {
  const { id, collections, config } = await readRoot();
  if (!id) return false;
  const next = ((collections[name] || []) as { id: string }[]).filter((x) => x.id !== itemId);
  await writeCollections(id, config, { ...collections, [name]: next });
  return true;
}
