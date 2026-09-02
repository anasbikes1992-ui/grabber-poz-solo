import { desc, eq } from 'drizzle-orm';
import { db, creativeJobs, mediaAssets } from '@/db';

export type SaveAssetInput = {
  assetType: 'AI_GENERATED' | 'FINISHED_VIDEO' | 'BRAND_ASSET' | 'PRODUCT_IMAGE';
  url: string;
  title: string;
  mimeType?: string;
  resolution?: string;
  tags?: string[];
  createdBy?: string | null;
};

export async function saveCreativeAsset(input: SaveAssetInput) {
  const [row] = await db
    .insert(mediaAssets)
    .values({
      assetType: input.assetType,
      fileUrl: input.url,
      title: input.title,
      mimeType: input.mimeType || 'application/octet-stream',
      source: 'AI_GENERATED',
      tags: input.tags || [],
      createdBy: input.createdBy || null,
    })
    .returning();
  return row;
}

export async function listCreativeAssets(limit = 50) {
  return db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(limit);
}

/** Merge DB assets with completed creative job outputs. */
export async function listCreativeLibrary(limit = 50) {
  const assets = await listCreativeAssets(limit);
  const jobs = await db
    .select()
    .from(creativeJobs)
    .where(eq(creativeJobs.status, 'COMPLETED'))
    .orderBy(desc(creativeJobs.completedAt))
    .limit(limit);

  const jobAssets = jobs
    .filter((j) => j.outputUrl)
    .map((j) => ({
      id: `job_${j.id}`,
      assetType: /\.(mp4|webm|mov)(\?|$)/i.test(j.outputUrl!) ? ('FINISHED_VIDEO' as const) : ('AI_GENERATED' as const),
      fileUrl: j.outputUrl!,
      url: j.outputUrl!,
      title: `Render ${j.id.slice(0, 8)}`,
      mimeType: 'application/octet-stream',
      tags: ['creative-job'],
      createdBy: null,
      createdAt: j.completedAt || j.createdAt,
    }));

  const merged = [...assets, ...jobAssets].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return merged.slice(0, limit).map((a) => ({
    ...a,
    url: 'fileUrl' in a && a.fileUrl ? a.fileUrl : (a as { url?: string }).url || '',
  }));
}
