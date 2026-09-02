import { desc, eq } from 'drizzle-orm';
import { db, creativeJobs, creativeProjects, customers } from '@/db';
import { readStorefrontConfig, writeStorefrontConfig } from '@/lib/config/storefront-config';
import { sendWhatsAppText } from '@/lib/integrations/whatsapp';
import { enqueueJob } from '@/lib/jobs/outbox';
import { titleWithKind, type CreativeKind } from '@/lib/creative/kinds';

export type CreateCreativeInput = {
  title: string;
  kind?: CreativeKind;
  productId?: string | null;
  format?: 'SHORT_FORM_30S' | 'SHORT_FORM_15S' | 'SHORT_FORM_60S' | 'LONG_FORM_2M';
  aspectRatio?: string;
  visualPrompt: string;
  productName?: string;
  productImageUrl?: string;
  commandId?: string;
  geminiCommand?: string;
  createdBy?: string | null;
  scriptSummary?: string;
  heroMediaType?: 'image' | 'video';
};

export async function listCreativeProjects(limit = 20) {
  return db
    .select()
    .from(creativeProjects)
    .orderBy(desc(creativeProjects.createdAt))
    .limit(limit);
}

export async function getCreativeProject(id: string) {
  const [project] = await db.select().from(creativeProjects).where(eq(creativeProjects.id, id)).limit(1);
  if (!project) return null;
  const jobs = await db
    .select()
    .from(creativeJobs)
    .where(eq(creativeJobs.projectId, id))
    .orderBy(desc(creativeJobs.createdAt));
  return { project, jobs };
}

export async function resolveHeroMediaFromProject(projectId: string) {
  const data = await getCreativeProject(projectId);
  if (!data) return null;
  const completed = data.jobs.find((j) => j.status === 'COMPLETED' && j.outputUrl);
  if (!completed?.outputUrl) return null;
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(completed.outputUrl);
  return {
    heroMediaUrl: completed.outputUrl,
    heroMediaType: (isVideo ? 'video' : 'image') as 'video' | 'image',
    heroMediaPosterUrl: isVideo ? undefined : completed.outputUrl,
  };
}

export async function queueCreativeRender(input: {
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
}) {
  return enqueueJob({
    type: 'CREATIVE_RENDER',
    idempotencyKey: `creative_render_${input.jobId}`,
    payload: input,
    maxAttempts: 4,
  });
}

export async function queueCreativePdf(input: {
  jobId: string;
  projectId: string;
  template: string;
  title: string;
  productIds?: string[];
  promoText?: string;
}) {
  return enqueueJob({
    type: 'CREATIVE_PDF',
    idempotencyKey: `creative_pdf_${input.jobId}`,
    payload: input,
    maxAttempts: 3,
  });
}

async function broadcastCreativeToCustomers(input: {
  announcement: string;
  heroTitle: string;
  audience?: string;
  limit?: number;
}) {
  const seg = String(input.audience || 'ALL').trim().toUpperCase();
  const limit = input.limit ?? 50;
  const shopUrl = process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  const message = `${input.heroTitle}\n\n${input.announcement}${shopUrl ? `\n\nShop: ${shopUrl}/products` : ''}`.trim();

  const targets =
    seg === 'ALL'
      ? await db.select().from(customers).where(eq(customers.active, true)).limit(limit)
      : await db.select().from(customers).where(eq(customers.segment, seg)).limit(limit);

  const phones = targets.map((c) => c.phone).filter(Boolean) as string[];
  if (!phones.length) return { queued: 0, targeted: 0, audience: seg };

  await enqueueJob({
    type: 'WHATSAPP_BROADCAST',
    idempotencyKey: `creative_publish_${Date.now()}_${seg}`,
    payload: { recipients: phones, text: message },
  });

  return { queued: phones.length, targeted: targets.length, audience: seg };
}

export async function createCreativeProject(input: CreateCreativeInput) {
  const title = input.kind ? titleWithKind(input.kind, input.title) : input.title;
  const [project] = await db
    .insert(creativeProjects)
    .values({
      title,
      productId: input.productId || null,
      format: input.format || 'SHORT_FORM_30S',
      aspectRatio: input.aspectRatio || '9:16',
      status: 'PENDING_REVIEW',
      createdBy: input.createdBy || null,
    })
    .returning();

  const [job] = await db
    .insert(creativeJobs)
    .values({
      projectId: project.id,
      status: 'QUEUED',
      progressPercent: 0,
      outputUrl: null,
    })
    .returning();

  return { project, job, scriptSummary: input.scriptSummary || input.visualPrompt.slice(0, 200) };
}

export async function approveCreativeCampaign(
  projectId: string,
  draft: {
    announcement?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    heroMediaType?: 'none' | 'image' | 'video';
    heroMediaUrl?: string;
    heroMediaPosterUrl?: string;
    broadcastAudience?: string;
    skipCustomerBroadcast?: boolean;
  },
) {
  const data = await getCreativeProject(projectId);
  if (!data) throw new Error('Creative project not found');

  const autoMedia = !draft.heroMediaUrl ? await resolveHeroMediaFromProject(projectId) : null;

  await db
    .update(creativeProjects)
    .set({ status: 'COMPLETED' })
    .where(eq(creativeProjects.id, projectId));

  const current = await readStorefrontConfig();
  const announcement = draft.announcement || `New campaign live: ${data.project.title}`;
  const heroTitle = draft.heroTitle || data.project.title;
  const heroSubtitle = draft.heroSubtitle || announcement;
  const heroMediaUrl = draft.heroMediaUrl || autoMedia?.heroMediaUrl;
  const heroMediaType =
    draft.heroMediaType ??
    (heroMediaUrl ? (autoMedia?.heroMediaType || 'video') : 'none');
  const heroMediaPosterUrl = draft.heroMediaPosterUrl || autoMedia?.heroMediaPosterUrl;

  const blocks = [
    { id: 'ann_1', type: 'ANNOUNCEMENT' as const, text: announcement, slot: 'TOP' as const, enabled: true },
    {
      id: 'hero_1',
      type: 'HERO' as const,
      title: heroTitle,
      subtitle: heroSubtitle,
      ctaLabel: 'Shop now',
      heroMediaType,
      heroMediaUrl,
      heroMediaPosterUrl,
      slot: 'HERO' as const,
      enabled: true,
    },
    {
      id: `mid_creative_${projectId.slice(0, 8)}`,
      type: 'MID_BANNER' as const,
      title: heroTitle,
      body: announcement,
      ctaLabel: 'Shop campaign',
      ctaHref: '/products',
      slot: 'MID' as const,
      enabled: true,
    },
    ...current.blocks.filter(
      (b) => b.type !== 'ANNOUNCEMENT' && b.type !== 'HERO' && b.type !== 'MID_BANNER',
    ),
  ];

  const storefront = await writeStorefrontConfig({ blocks });

  const ownerPhone = current.theme.whatsappNumber;
  let whatsapp: { sent: boolean; stub?: boolean } | undefined;
  if (ownerPhone) {
    const result = await sendWhatsAppText({
      to: ownerPhone,
      text: `Campaign approved: ${heroTitle}. ${announcement}`,
    });
    whatsapp = {
      sent: result.success,
      stub: result.success && 'stub' in result ? result.stub === true : undefined,
    };
  }

  let customerBroadcast: { queued: number; targeted: number; audience: string } | undefined;
  if (!draft.skipCustomerBroadcast) {
    customerBroadcast = await broadcastCreativeToCustomers({
      announcement,
      heroTitle,
      audience: draft.broadcastAudience || 'ALL',
    });
  }

  return { projectId, storefront, whatsapp, customerBroadcast, heroMediaUrl };
}
