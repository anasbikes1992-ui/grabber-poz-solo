import { createCreativeProject, queueCreativeRender } from '@/lib/creative/creative-repo';
import { readBrandBrain } from '@/lib/creative/brand-brain';
import { buildGeminiVideoPrompt } from '@/lib/creative/marketing-yatra-prompts';

export type DraftCreativeCampaignInput = {
  title: string;
  productName?: string;
  commandId?: string;
  announcement?: string;
  productImageUrl?: string;
  createdBy?: string | null;
};

/** Create a creative project + queue render (Jarvis draft execute + internal reuse). */
export async function draftCreativeCampaign(input: DraftCreativeCampaignInput) {
  const brand = await readBrandBrain();
  const commandId = input.commandId || 'clean-set';
  const productName = input.productName || input.title;

  const built = buildGeminiVideoPrompt({
    commandId,
    productName,
    productImageUrl: input.productImageUrl,
    brandVoice: brand.voice,
  });

  const { project, job } = await createCreativeProject({
    title: input.title,
    format: built.prompt.suggestedFormat,
    aspectRatio: built.prompt.suggestedAspectRatio,
    visualPrompt: built.visualPrompt,
    productName,
    productImageUrl: input.productImageUrl,
    commandId: built.prompt.id,
    geminiCommand: built.geminiCommand,
    heroMediaType: built.prompt.heroMediaType,
    createdBy: input.createdBy || null,
    scriptSummary: input.announcement || `${brand.voice}: ${built.visualPrompt.slice(0, 180)}`,
  });

  await queueCreativeRender({
    jobId: job.id,
    projectId: project.id,
    visualPrompt: built.visualPrompt,
    productImageUrl: input.productImageUrl,
    aspectRatio: built.prompt.suggestedAspectRatio,
    heroMediaType: built.prompt.heroMediaType,
  });

  return {
    projectId: project.id,
    jobId: job.id,
    title: input.title,
    announcement: input.announcement || `New campaign: ${input.title}`,
    visualPrompt: built.visualPrompt,
    geminiCommand: built.geminiCommand,
    status: 'QUEUED',
  };
}
