import { NextRequest, NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { createCreativeProject, queueCreativePdf } from '@/lib/creative/creative-repo';
import { generateAndCachePdf } from '@/lib/creative/creative-pdf-processor';
import type { PdfTemplateKind } from '@/lib/creative/pdf-studio';

export async function POST(req: NextRequest) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const template = (body.template || 'PRICE_LIST') as PdfTemplateKind;
    const title = String(body.title || 'Document');
    const productIds = body.productIds as string[] | undefined;
    const promoText = body.promoText as string | undefined;

    const { project, job } = await createCreativeProject({
      title,
      kind: 'PDF',
      format: 'SHORT_FORM_30S',
      aspectRatio: '16:9',
      visualPrompt: `PDF ${template}: ${title}`,
      createdBy: session?.userId || null,
    });

    const payload = {
      jobId: job.id,
      projectId: project.id,
      template,
      title,
      productIds,
      promoText,
    };

    await generateAndCachePdf(payload);
    await queueCreativePdf(payload).catch(() => undefined);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const downloadUrl = `${baseUrl}/api/creative/pdf/download?projectId=${project.id}`;

    return NextResponse.json({
      success: true,
      projectId: project.id,
      jobId: job.id,
      downloadUrl,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
