import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listCreativeProjects } from '@/lib/creative/creative-repo';
import { parseCreativeKind } from '@/lib/creative/kinds';
import { listCreativeLibrary } from '@/lib/creative/asset-library';
import { hasGpuWorker } from '@/lib/creative/gpu-worker-client';
import { hasCreativeMediaPipeline } from '@/lib/creative/media-provider';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await listCreativeProjects(100);
    const assets = await listCreativeLibrary(100);

    const counts = { pdf: 0, video: 0, ugc: 0, campaign: 0 };
    for (const p of projects) {
      const k = parseCreativeKind(p.title);
      if (k === 'PDF') counts.pdf++;
      else if (k === 'VIDEO') counts.video++;
      else if (k === 'UGC') counts.ugc++;
      else counts.campaign++;
    }

    return NextResponse.json({
      success: true,
      stats: {
        projects: projects.length,
        ...counts,
        assets: assets.length,
        gpuWorker: hasGpuWorker(),
        mediaPipeline: hasCreativeMediaPipeline(),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
