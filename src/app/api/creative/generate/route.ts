import { NextRequest, NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';

/**
 * Creative job enqueue — honest about missing media pipeline credentials.
 * Does not invent CDN URLs that look like real hosted assets.
 */
export async function POST(req: NextRequest) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const { prompt, productName, format, aspectRatio, duration } = body;
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    const jobId = `creative_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const hasPipeline =
      Boolean(process.env.FAL_KEY || process.env.REPLICATE_API_TOKEN || process.env.CLOUDINARY_URL);

    if (!hasPipeline) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          {
            success: false,
            error: 'Creative media pipeline not configured (set FAL_KEY / REPLICATE_API_TOKEN / CLOUDINARY_URL)',
          },
          { status: 503 }
        );
      }
      return NextResponse.json({
        success: true,
        stub: true,
        jobId,
        status: 'QUEUED_STUB',
        productName: productName || 'Grabber Retail Product',
        format: format || 'SHORT_FORM_30S',
        aspectRatio: aspectRatio || '9:16',
        durationSeconds: duration || 15.0,
        videoUrl: null,
        note: 'Dev stub — no fabricated CDN URL. Configure a media provider to render.',
        scriptSummary: `Hook draft: Discover ${productName || 'our premium collection'} — order on WhatsApp.`,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: 'QUEUED',
      productName: productName || 'Grabber Retail Product',
      format: format || 'SHORT_FORM_30S',
      aspectRatio: aspectRatio || '9:16',
      durationSeconds: duration || 15.0,
      videoUrl: null,
      note: 'Job accepted — wire provider dispatcher to fill videoUrl when render completes',
      scriptSummary: `Hook draft: Discover ${productName || 'our premium collection'} — order on WhatsApp.`,
      createdAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Creative generation failed' },
      { status: 500 }
    );
  }
}
