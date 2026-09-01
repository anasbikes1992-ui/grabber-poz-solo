import { NextRequest, NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { createCreativeProject } from '@/lib/creative/creative-repo';
import { readBrandBrain } from '@/lib/creative/brand-brain';

export async function POST(req: NextRequest) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const { prompt, productName, productId, format, aspectRatio, duration } = body;
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    const brand = await readBrandBrain();
    const title = `${productName || 'Campaign'} · ${format || 'SHORT_FORM_30S'}`;
    const scriptSummary = `${brand.voice}: ${prompt.slice(0, 180)}`;

    const hasPipeline =
      Boolean(process.env.FAL_KEY || process.env.REPLICATE_API_TOKEN || process.env.CLOUDINARY_URL);

    const { project, job } = await createCreativeProject({
      title,
      productId: productId || null,
      format: format || 'SHORT_FORM_30S',
      aspectRatio: aspectRatio || '9:16',
      visualPrompt: prompt,
      productName,
      createdBy: session?.userId || null,
      scriptSummary,
    });

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
        success: true,
        stub: true,
        jobId: job.id,
        projectId: project.id,
        status: 'QUEUED_STUB',
        productName: productName || 'Grabber Retail Product',
        format: format || 'SHORT_FORM_30S',
        aspectRatio: aspectRatio || '9:16',
        durationSeconds: duration || 15.0,
        videoUrl: null,
        note: 'Dev stub — project saved to DB. Configure a media provider to render.',
        scriptSummary,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      projectId: project.id,
      status: 'QUEUED',
      productName: productName || 'Grabber Retail Product',
      format: format || 'SHORT_FORM_30S',
      aspectRatio: aspectRatio || '9:16',
      durationSeconds: duration || 15.0,
      videoUrl: null,
      note: 'Job queued in database — wire provider dispatcher for outputUrl',
      scriptSummary,
      createdAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Creative generation failed' },
      { status: 500 },
    );
  }
}
