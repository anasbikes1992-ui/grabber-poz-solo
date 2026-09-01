import { desc, eq } from 'drizzle-orm';
import { db, creativeJobs, creativeProjects } from '@/db';
import { readStorefrontConfig, writeStorefrontConfig } from '@/lib/config/storefront-config';

export type CreateCreativeInput = {
  title: string;
  productId?: string | null;
  format?: 'SHORT_FORM_30S' | 'SHORT_FORM_15S' | 'SHORT_FORM_60S' | 'LONG_FORM_2M';
  aspectRatio?: string;
  visualPrompt: string;
  productName?: string;
  createdBy?: string | null;
  scriptSummary?: string;
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
  const jobs = await db.select().from(creativeJobs).where(eq(creativeJobs.projectId, id)).orderBy(desc(creativeJobs.createdAt));
  return { project, jobs };
}

export async function createCreativeProject(input: CreateCreativeInput) {
  const [project] = await db
    .insert(creativeProjects)
    .values({
      title: input.title,
      productId: input.productId || null,
      format: input.format || 'SHORT_FORM_30S',
      aspectRatio: input.aspectRatio || '9:16',
      status: 'SCRIPTED',
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

export async function approveCreativeCampaign(projectId: string, draft: {
  announcement?: string;
  heroTitle?: string;
  heroSubtitle?: string;
}) {
  const data = await getCreativeProject(projectId);
  if (!data) throw new Error('Creative project not found');

  await db
    .update(creativeProjects)
    .set({ status: 'COMPLETED' })
    .where(eq(creativeProjects.id, projectId));

  const current = await readStorefrontConfig();
  const announcement = draft.announcement || `New campaign live: ${data.project.title}`;
  const heroTitle = draft.heroTitle || data.project.title;
  const heroSubtitle = draft.heroSubtitle || announcement;

  const blocks = [
    { id: 'ann_1', type: 'ANNOUNCEMENT' as const, text: announcement },
    {
      id: 'hero_1',
      type: 'HERO' as const,
      title: heroTitle,
      subtitle: heroSubtitle,
      ctaLabel: 'Shop now',
    },
    ...current.blocks.filter((b) => b.type !== 'ANNOUNCEMENT' && b.type !== 'HERO'),
  ];

  const storefront = await writeStorefrontConfig({ blocks });
  return { projectId, storefront };
}
