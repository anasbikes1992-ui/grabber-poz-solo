import { NextResponse } from 'next/server';
import { claimBatch, markComplete, markFailed } from '@/lib/jobs/outbox';
import { handleJob } from '@/lib/jobs/handlers';
import { ensurePeriodicJobs } from '@/lib/jobs/periodic';
import type { JobType } from '@/lib/jobs/outbox';

export const maxDuration = 60;

function authorizeCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === 'production' && !secret) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET required in production' },
      { status: 401 },
    );
  }
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }
  return null;
}

export async function GET(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const workerId = `cron_${Date.now()}`;
  const scheduled = await ensurePeriodicJobs();
  const jobs = await claimBatch(workerId, 15);
  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await handleJob(job.type as JobType, (job.payloadJson as Record<string, unknown>) || {});
      await markComplete(job.id);
      processed += 1;
    } catch (err) {
      await markFailed(job.id, (err as Error).message, job.attempts, job.maxAttempts);
      failed += 1;
    }
  }

  return NextResponse.json({ success: true, scheduled, claimed: jobs.length, processed, failed });
}

export async function POST(req: Request) {
  return GET(req);
}
