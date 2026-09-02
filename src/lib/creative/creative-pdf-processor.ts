import { eq } from 'drizzle-orm';
import { db, creativeJobs, creativeProjects } from '@/db';
import { readBrandBrain } from '@/lib/creative/brand-brain';
import { generatePdfDocument, type PdfTemplateKind } from '@/lib/creative/pdf-studio';
import { saveCreativeAsset } from '@/lib/creative/asset-library';

export type CreativePdfPayload = {
  jobId: string;
  projectId: string;
  template: string;
  title: string;
  productIds?: string[];
  promoText?: string;
};

export async function processCreativePdfJob(payload: CreativePdfPayload): Promise<{
  jobId: string;
  outputUrl: string;
}> {
  const jobId = String(payload.jobId || '');
  const projectId = String(payload.projectId || '');
  if (!jobId || !projectId) throw new Error('Creative PDF job missing jobId or projectId');

  const brand = await readBrandBrain();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';

  await db
    .update(creativeJobs)
    .set({ status: 'RENDERING_FFMPEG', progressPercent: 20, errorMessage: null })
    .where(eq(creativeJobs.id, jobId));

  const pdfBytes = await generatePdfDocument({
    template: payload.template as PdfTemplateKind,
    title: payload.title,
    productIds: payload.productIds,
    brand,
    promoText: payload.promoText,
  });

  const outputUrl = `${baseUrl}/api/creative/pdf/download?projectId=${projectId}`;

  await saveCreativeAsset({
    assetType: 'BRAND_ASSET',
    url: outputUrl,
    title: payload.title,
    mimeType: 'application/pdf',
    tags: ['pdf', payload.template.toLowerCase()],
  });

  await db
    .update(creativeJobs)
    .set({
      status: 'COMPLETED',
      progressPercent: 100,
      outputUrl,
      videoProvider: 'PDF_LIB',
      completedAt: new Date(),
      errorMessage: null,
    })
    .where(eq(creativeJobs.id, jobId));

  await db
    .update(creativeProjects)
    .set({ status: 'PENDING_REVIEW' })
    .where(eq(creativeProjects.id, projectId));

  return { jobId, outputUrl };
}

/** In-memory cache for PDF bytes keyed by projectId (dev/single-instance). */
const pdfCache = new Map<string, Uint8Array>();

export function cachePdfForProject(projectId: string, bytes: Uint8Array) {
  pdfCache.set(projectId, bytes);
}

export function getCachedPdf(projectId: string): Uint8Array | undefined {
  return pdfCache.get(projectId);
}

export async function generateAndCachePdf(payload: CreativePdfPayload): Promise<Uint8Array> {
  const brand = await readBrandBrain();
  const bytes = await generatePdfDocument({
    template: payload.template as PdfTemplateKind,
    title: payload.title,
    productIds: payload.productIds,
    brand,
    promoText: payload.promoText,
  });
  cachePdfForProject(payload.projectId, bytes);
  return bytes;
}
