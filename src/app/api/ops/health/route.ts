import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listDeadJobs, retryDeadJob } from '@/lib/jobs/outbox';
import { reconcileStockDrift } from '@/lib/inventory/stock-service';
import { listAutomationLogs } from '@/lib/automation/rules-store';
import { db, webhookEvents } from '@/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const deadJobs = await listDeadJobs(20);
    const failedWebhooks = await db.select().from(webhookEvents).where(eq(webhookEvents.status, 'FAILED')).limit(20);
    const automationFailed = (await listAutomationLogs(50)).filter((l) => l.status === 'FAILED');
    let stockDrift: Awaited<ReturnType<typeof reconcileStockDrift>> = [];
    try {
      stockDrift = await reconcileStockDrift();
    } catch {
      stockDrift = [];
    }

    return NextResponse.json({
      success: true,
      deadJobs: deadJobs.length,
      deadJobRows: deadJobs,
      failedWebhooks: failedWebhooks.length,
      failedWebhookRows: failedWebhooks,
      automationFailed: automationFailed.length,
      automationFailedRows: automationFailed.slice(0, 10),
      stockDriftSkus: stockDrift.length,
      stockDrift,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    if (body.action === 'retry_job' && body.jobId) {
      await retryDeadJob(String(body.jobId));
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
