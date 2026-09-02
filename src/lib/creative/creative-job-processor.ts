import { eq } from 'drizzle-orm';
import { db, creativeJobs, creativeProjects } from '@/db';
import { renderCreativeMedia } from '@/lib/creative/media-provider';
import { hasGpuWorker, queueGpuVideoRender } from '@/lib/creative/gpu-worker-client';
import { saveCreativeAsset } from '@/lib/creative/asset-library';

export type CreativeRenderPayload = {
  jobId: string;
  projectId: string;
  visualPrompt: string;
  productImageUrl?: string | null;
  aspectRatio?: string;
  heroMediaType?: 'image' | 'video';
  renderKind?: 'VIDEO' | 'UGC';
  scriptText?: string;
  variantLabel?: string;
  productName?: string;
  format?: string;
};

export async function processCreativeRenderJob(payload: CreativeRenderPayload): Promise<{
  jobId: string;
  outputUrl: string;
  provider: string;
}> {
  const jobId = String(payload.jobId || '');
  const projectId = String(payload.projectId || '');
  if (!jobId || !projectId) throw new Error('Creative render job missing jobId or projectId');

  const [job] = await db.select().from(creativeJobs).where(eq(creativeJobs.id, jobId)).limit(1);
  if (!job) throw new Error(`Creative job ${jobId} not found`);
  if (job.status === 'COMPLETED' && job.outputUrl) {
    return { jobId, outputUrl: job.outputUrl, provider: 'CACHED' };
  }

  await db
    .update(creativeJobs)
    .set({ status: 'GENERATING_MEDIA', progressPercent: 10, errorMessage: null })
    .where(eq(creativeJobs.id, jobId));

  await db
    .update(creativeProjects)
    .set({ status: 'RENDERING' })
    .where(eq(creativeProjects.id, projectId));

  try {
    let outputUrl: string;
    let provider: string;

    if (hasGpuWorker() && (payload.renderKind === 'UGC' || payload.heroMediaType === 'video')) {
      await db
        .update(creativeJobs)
        .set({ status: 'RENDERING_FFMPEG', progressPercent: 40 })
        .where(eq(creativeJobs.id, jobId));

      const gpu = await queueGpuVideoRender({
        prompt: String(payload.visualPrompt || ''),
        productName: payload.productName,
        format: payload.format,
        aspectRatio: payload.aspectRatio,
        scriptText: payload.scriptText,
        variantLabel: payload.variantLabel,
      });

      if (gpu.success && gpu.previewUrl) {
        outputUrl = gpu.previewUrl;
        provider = gpu.provider;
      } else if (gpu.success && gpu.status === 'QUEUED') {
        outputUrl = `pending://gpu-worker/${gpu.jobId || jobId}`;
        provider = 'GPU_WORKER_QUEUED';
      } else {
        const fallback = await renderCreativeMedia({
          visualPrompt: String(payload.visualPrompt || ''),
          productImageUrl: payload.productImageUrl,
          aspectRatio: payload.aspectRatio,
          heroMediaType: payload.heroMediaType,
        });
        outputUrl = fallback.outputUrl;
        provider = fallback.provider;
      }
    } else {
      const result = await renderCreativeMedia({
        visualPrompt: String(payload.visualPrompt || ''),
        productImageUrl: payload.productImageUrl,
        aspectRatio: payload.aspectRatio,
        heroMediaType: payload.heroMediaType,
      });
      outputUrl = result.outputUrl;
      provider = result.provider;
    }

    if (outputUrl && !outputUrl.startsWith('pending://')) {
      await saveCreativeAsset({
        assetType: payload.heroMediaType === 'video' || payload.renderKind === 'UGC' ? 'FINISHED_VIDEO' : 'AI_GENERATED',
        url: outputUrl,
        title: payload.variantLabel || `Render ${jobId.slice(0, 8)}`,
        tags: payload.renderKind === 'UGC' ? ['ugc', 'video'] : ['video'],
      }).catch(() => undefined);
    }

    await db
      .update(creativeJobs)
      .set({
        status: 'COMPLETED',
        progressPercent: 100,
        outputUrl,
        videoProvider: provider,
        completedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(creativeJobs.id, jobId));

    await db
      .update(creativeProjects)
      .set({ status: 'PENDING_REVIEW' })
      .where(eq(creativeProjects.id, projectId));

    return { jobId, outputUrl, provider };
  } catch (err) {
    const message = (err as Error).message.slice(0, 2000);
    await db
      .update(creativeJobs)
      .set({ status: 'FAILED', progressPercent: 0, errorMessage: message })
      .where(eq(creativeJobs.id, jobId));
    await db
      .update(creativeProjects)
      .set({ status: 'FAILED' })
      .where(eq(creativeProjects.id, projectId));
    throw err;
  }
}
