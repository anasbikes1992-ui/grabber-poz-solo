import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { costVarianceAlerts, db, forecastAccuracySnapshots, purchaseApprovalEvents, supplierScorecards } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';
import {
  createCostVarianceAlerts,
  generateSupplierScorecards,
  snapshotForecastAccuracy,
  transitionPurchaseApproval,
} from '@/lib/erp/control-loop';

async function requireActor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET() {
  try {
    await requireActor();
    const [approvalEvents, supplierScores, varianceAlerts, forecastAccuracy] = await Promise.all([
      db.select().from(purchaseApprovalEvents).orderBy(desc(purchaseApprovalEvents.createdAt)).limit(50).catch(() => []),
      db.select().from(supplierScorecards).orderBy(desc(supplierScorecards.createdAt)).limit(50).catch(() => []),
      db.select().from(costVarianceAlerts).orderBy(desc(costVarianceAlerts.createdAt)).limit(50).catch(() => []),
      db.select().from(forecastAccuracySnapshots).orderBy(desc(forecastAccuracySnapshots.measuredAt)).limit(50).catch(() => []),
    ]);
    return NextResponse.json({ success: true, approvalEvents, supplierScores, varianceAlerts, forecastAccuracy });
  } catch (err) {
    return publicErrorResponse(err, { message: 'Could not load ERP control loop', logMessage: 'ERP control load failed' });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireActor();
    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'purchase_approval') {
      if (!body.purchaseOrderId || !body.decision) {
        return validationErrorResponse('purchaseOrderId and decision are required.');
      }
      const purchaseOrder = await transitionPurchaseApproval({
        purchaseOrderId: String(body.purchaseOrderId),
        decision: String(body.decision).toUpperCase() as 'SUBMIT' | 'APPROVE' | 'REJECT' | 'CANCEL',
        actorId: session.userId,
        notes: body.notes ? String(body.notes) : null,
      });
      return NextResponse.json({ success: true, purchaseOrder });
    }

    if (action === 'cost_variance_scan') {
      const result = await createCostVarianceAlerts(Number(body.thresholdPercent || 5));
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'forecast_accuracy_snapshot') {
      const result = await snapshotForecastAccuracy(body.forecastRunId ? String(body.forecastRunId) : undefined, Number(body.horizonDays || 30));
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'supplier_scorecards') {
      const periodEnd = body.periodEnd ? new Date(String(body.periodEnd)) : new Date();
      const periodStart = body.periodStart
        ? new Date(String(body.periodStart))
        : new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
      const result = await generateSupplierScorecards(periodStart, periodEnd);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return publicErrorResponse(err, { message: 'Could not update ERP control loop', logMessage: 'ERP control update failed' });
  }
}
