import { NextRequest, NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { createCreativeProject } from '@/lib/creative/creative-repo';
import { readBrandBrain } from '@/lib/creative/brand-brain';
import { buildGeminiVideoPrompt } from '@/lib/creative/marketing-yatra-prompts';

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

    const hasPipeline =
      Boolean(process.env.FAL_KEY || process.env.REPLICATE_API_TOKEN || process.env.CLOUDINARY_URL);

    const { project, job } = await createCreativeProject({
      title,
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

    const responseBase = {
      success: true as const,
      jobId: job.id,
      projectId: project.id,
      productName: productName || 'Grabber Retail Product',
      format: resolvedFormat,
      aspectRatio: resolvedAspect,
      durationSeconds: duration || 15.0,
      videoUrl: null as string | null,
      scriptSummary,
      visualPrompt,
      geminiCommand,
      commandId: resolvedCommandId,
      heroMediaType,
      productImageUrl: productImageUrl || null,
      createdAt: new Date().toISOString(),
    };

    if (!hasPipeline) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          {
            success: false,
            error: 'Creative media pipeline not configured (set FAL_KEY / REPLICATE_API_TOKEN / CLOUDINARY_URL)',
          },
          { status: 503 },
        );
      }
      return NextResponse.json({
        ...responseBase,
        stub: true,
        status: 'QUEUED_STUB',
        note: 'Dev stub — project saved to DB. Paste geminiCommand into Gemini with your product photo.',
      });
    }

    return NextResponse.json({
      ...responseBase,
      status: 'QUEUED',
      note: 'Job queued in database — wire provider dispatcher for outputUrl',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Creative generation failed' },
      { status: 500 },
    );
  }
}
