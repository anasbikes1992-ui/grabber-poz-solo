import { NextRequest, NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { createCreativeProject, queueCreativeRender } from '@/lib/creative/creative-repo';
import { readBrandBrain } from '@/lib/creative/brand-brain';
import { buildGeminiVideoPrompt } from '@/lib/creative/marketing-yatra-prompts';
import { hasCreativeMediaPipeline } from '@/lib/creative/media-provider';

export async function POST(req: NextRequest) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const {
      prompt: rawPrompt,
      commandId,
      productName,
      productId,
      productImageUrl,
      stylingHints,
      format,
      aspectRatio,
      duration,
    } = body;

    const brand = await readBrandBrain();
    let visualPrompt = rawPrompt as string | undefined;
    let geminiCommand: string | undefined;
    let resolvedCommandId = commandId as string | undefined;
    let heroMediaType: 'image' | 'video' | undefined;

    let builtPrompt: ReturnType<typeof buildGeminiVideoPrompt> | undefined;

    if (commandId) {
      builtPrompt = buildGeminiVideoPrompt({
        commandId,
        productName: productName || 'Product',
        productImageUrl,
        stylingHints,
        brandVoice: brand.voice,
      });
      visualPrompt = builtPrompt.visualPrompt;
      geminiCommand = builtPrompt.geminiCommand;
      resolvedCommandId = builtPrompt.prompt.id;
      heroMediaType = builtPrompt.prompt.heroMediaType;
    }

    if (!visualPrompt?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt or commandId is required' },
        { status: 400 },
      );
    }

    const resolvedFormat = format || builtPrompt?.prompt.suggestedFormat || 'SHORT_FORM_30S';
    const resolvedAspect = aspectRatio || builtPrompt?.prompt.suggestedAspectRatio || '9:16';
    const title = `${productName || 'Campaign'} · ${resolvedCommandId || resolvedFormat || 'SHORT_FORM_30S'}`;
    const scriptSummary = `${brand.voice}: ${visualPrompt.slice(0, 220)}`;

    const pipelineReady = hasCreativeMediaPipeline();
    if (!pipelineReady && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          success: false,
          error: 'Creative media pipeline not configured (set FAL_KEY or REPLICATE_API_TOKEN)',
        },
        { status: 503 },
      );
    }

    const { project, job } = await createCreativeProject({
      title,
      kind: 'VIDEO',
      productId: productId || null,
      format: resolvedFormat,
      aspectRatio: resolvedAspect,
      visualPrompt,
      productName,
      productImageUrl,
      commandId: resolvedCommandId,
      geminiCommand,
      heroMediaType,
      createdBy: session?.userId || null,
      scriptSummary,
    });

    const queued = await queueCreativeRender({
      jobId: job.id,
      projectId: project.id,
      visualPrompt,
      productImageUrl,
      aspectRatio: resolvedAspect,
      heroMediaType,
      renderKind: 'VIDEO',
      productName: productName || undefined,
      format: resolvedFormat,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      projectId: project.id,
      productName: productName || 'Grabber Retail Product',
      format: resolvedFormat,
      aspectRatio: resolvedAspect,
      durationSeconds: duration || 15.0,
      videoUrl: null,
      scriptSummary,
      visualPrompt,
      geminiCommand,
      commandId: resolvedCommandId,
      heroMediaType,
      productImageUrl: productImageUrl || null,
      createdAt: new Date().toISOString(),
      status: pipelineReady ? 'QUEUED' : 'QUEUED_DEV',
      stub: !pipelineReady,
      queued: queued.enqueued,
      note: pipelineReady
        ? 'Render job queued — media will appear when processing completes.'
        : 'Dev mode — placeholder media will render via job worker.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Creative generation failed' },
      { status: 500 },
    );
  }
}
