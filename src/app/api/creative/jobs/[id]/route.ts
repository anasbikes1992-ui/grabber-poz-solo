import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, creativeJobs } from '@/db';
import { getSession } from '@/lib/auth/session';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await ctx.params;
    const [job] = await db.select().from(creativeJobs).where(eq(creativeJobs.id, id)).limit(1);
    if (!job) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        projectId: job.projectId,
        status: job.status,
        progressPercent: job.progressPercent,
        outputUrl: job.outputUrl,
        errorMessage: job.errorMessage,
        videoProvider: job.videoProvider,
        completedAt: job.completedAt,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
