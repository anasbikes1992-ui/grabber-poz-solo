import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listCreativeProjects, getCreativeProject } from '@/lib/creative/creative-repo';
import { parseCreativeKind } from '@/lib/creative/kinds';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    const kindFilter = url.searchParams.get('kind');

    if (projectId) {
      const detail = await getCreativeProject(projectId);
      if (!detail) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true, ...detail });
    }

    let projects = await listCreativeProjects(50);
    if (kindFilter) {
      projects = projects.filter((p) => parseCreativeKind(p.title) === kindFilter.toUpperCase());
    }

    const enriched = await Promise.all(
      projects.map(async (p) => {
        const detail = await getCreativeProject(p.id);
        const latestJob = detail?.jobs[0];
        return {
          ...p,
          kind: parseCreativeKind(p.title),
          latestJobStatus: latestJob?.status,
          outputUrl: latestJob?.outputUrl,
          progressPercent: latestJob?.progressPercent,
        };
      }),
    );
    return NextResponse.json({ success: true, projects: enriched });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
