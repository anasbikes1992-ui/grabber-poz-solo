import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getCachedPdf, generateAndCachePdf } from '@/lib/creative/creative-pdf-processor';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    let bytes = getCachedPdf(projectId);
    if (!bytes) {
      const { getCreativeProject } = await import('@/lib/creative/creative-repo');
      const { readBrandBrain } = await import('@/lib/creative/brand-brain');
      const { generatePdfDocument } = await import('@/lib/creative/pdf-studio');

      const detail = await getCreativeProject(projectId);
      if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const brand = await readBrandBrain();
      bytes = await generatePdfDocument({
        template: 'PRICE_LIST',
        title: detail.project.title.replace(/^\[PDF\]\s*/i, ''),
        brand,
      });
    }

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="grabber-${projectId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
