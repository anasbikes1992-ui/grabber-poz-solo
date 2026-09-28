import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import {
  costVarianceAlerts,
  db,
  forecastAccuracySnapshots,
  forecastItems,
  forecastRuns,
  purchaseApprovalEvents,
  purchaseOrderLines,
  purchaseOrders,
  stockMovements,
  supplierScorecards,
  suppliers,
} from '@/db';

export type ForecastAccuracyInput = Array<{ forecastQty: number; actualQty: number }>;

export function calculateWmapeAndBias(rows: ForecastAccuracyInput) {
  const actualSum = rows.reduce((sum, row) => sum + Math.abs(Number(row.actualQty || 0)), 0);
  const absError = rows.reduce((sum, row) => sum + Math.abs(Number(row.actualQty || 0) - Number(row.forecastQty || 0)), 0);
  const signedError = rows.reduce((sum, row) => sum + (Number(row.forecastQty || 0) - Number(row.actualQty || 0)), 0);
  const wmape = actualSum === 0 ? 0 : absError / actualSum;
  const bias = actualSum === 0 ? 0 : signedError / actualSum;
  return {
    wmape: Number(wmape.toFixed(4)),
    bias: Number(bias.toFixed(4)),
  };
}

export function costVarianceSeverity(expectedCost: number, actualCost: number) {
  if (expectedCost <= 0) return { variancePercent: 0, severity: 'INFO' };
  const variancePercent = ((actualCost - expectedCost) / expectedCost) * 100;
  const abs = Math.abs(variancePercent);
  const severity = abs >= 20 ? 'HIGH' : abs >= 10 ? 'MEDIUM' : abs >= 5 ? 'LOW' : 'INFO';
  return { variancePercent: Number(variancePercent.toFixed(4)), severity };
}

export async function transitionPurchaseApproval(input: {
  purchaseOrderId: string;
  decision: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'CANCEL';
  actorId?: string | null;
  notes?: string | null;
}) {
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.purchaseOrderId)).limit(1);
  if (!po) throw new Error('Purchase order not found');
  const transition: Record<string, string> = {
    SUBMIT: 'SUBMITTED',
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED',
    CANCEL: 'CANCELLED',
  };
  const toStatus = transition[input.decision];
  if (!toStatus) throw new Error('Unsupported purchase approval decision');
  if (['PARTIALLY_RECEIVED', 'RECEIVED'].includes(po.status)) throw new Error('Cannot change approval after receiving stock');
  const [updated] = await db
    .update(purchaseOrders)
    .set({
      status: toStatus,
      approvedBy: input.decision === 'APPROVE' ? input.actorId || null : po.approvedBy,
    })
    .where(eq(purchaseOrders.id, po.id))
    .returning();
  await db.insert(purchaseApprovalEvents).values({
    purchaseOrderId: po.id,
    fromStatus: po.status,
    toStatus,
    decision: input.decision,
    actorId: input.actorId || null,
    notes: input.notes || null,
  });
  return updated;
}

export async function createCostVarianceAlerts(thresholdPercent = 5) {
  const lines = await db
    .select({
      po: purchaseOrders,
      line: purchaseOrderLines,
    })
    .from(purchaseOrderLines)
    .innerJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderLines.poId))
    .where(gte(purchaseOrderLines.receivedQty, 1))
    .limit(250);

  let created = 0;
  for (const row of lines) {
    const [latestReceipt] = await db
      .select()
      .from(stockMovements)
      .where(and(eq(stockMovements.referenceType, 'PURCHASE_ORDER'), eq(stockMovements.referenceId, row.po.id), eq(stockMovements.productId, row.line.productId)))
      .orderBy(desc(stockMovements.createdAt))
      .limit(1);
    if (!latestReceipt?.unitCost) continue;
    const expected = Number(row.line.unitCost);
    const actual = Number(latestReceipt.unitCost);
    const variance = costVarianceSeverity(expected, actual);
    if (Math.abs(variance.variancePercent) < thresholdPercent) continue;
    await db.insert(costVarianceAlerts).values({
      supplierId: row.po.supplierId,
      productId: row.line.productId,
      purchaseOrderId: row.po.id,
      expectedCost: expected.toFixed(2),
      actualCost: actual.toFixed(2),
      variancePercent: variance.variancePercent.toFixed(4),
      severity: variance.severity,
      detailJson: { orderedQty: row.line.orderedQty, receivedQty: row.line.receivedQty },
    }).catch(() => undefined);
    created += 1;
  }
  return { created };
}

export async function snapshotForecastAccuracy(forecastRunId?: string, horizonDays = 30) {
  const [run] = forecastRunId
    ? await db.select().from(forecastRuns).where(eq(forecastRuns.id, forecastRunId)).limit(1)
    : await db.select().from(forecastRuns).orderBy(desc(forecastRuns.createdAt)).limit(1);
  if (!run) return { created: 0, wmape: 0, bias: 0 };
  const items = await db.select().from(forecastItems).where(eq(forecastItems.runId, run.id)).limit(500);
  const since = new Date(Date.now() - horizonDays * 24 * 60 * 60 * 1000);
  const rows: ForecastAccuracyInput = [];
  let created = 0;
  for (const item of items) {
    const [actual] = await db
      .select({ qty: sql<number>`coalesce(abs(sum(${stockMovements.delta})), 0)::int` })
      .from(stockMovements)
      .where(and(eq(stockMovements.productId, item.productId), eq(stockMovements.type, 'SALE'), gte(stockMovements.createdAt, since)));
    const forecastQty = Number(item.avgDailyDemand) * horizonDays;
    const actualQty = Number(actual?.qty || 0);
    const metrics = calculateWmapeAndBias([{ forecastQty, actualQty }]);
    await db.insert(forecastAccuracySnapshots).values({
      forecastRunId: run.id,
      productId: item.productId,
      horizonDays,
      forecastQty: forecastQty.toFixed(4),
      actualQty: actualQty.toFixed(4),
      wmape: metrics.wmape.toFixed(4),
      bias: metrics.bias.toFixed(4),
      method: run.method,
    });
    rows.push({ forecastQty, actualQty });
    created += 1;
  }
  return { created, ...calculateWmapeAndBias(rows) };
}

export async function generateSupplierScorecards(periodStart: Date, periodEnd: Date) {
  const supplierRows = await db.select().from(suppliers).where(eq(suppliers.active, true)).limit(250);
  let created = 0;
  for (const supplier of supplierRows) {
    const pos = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.supplierId, supplier.id), gte(purchaseOrders.createdAt, periodStart), lte(purchaseOrders.createdAt, periodEnd)))
      .limit(500);
    let ordered = 0;
    let received = 0;
    for (const po of pos) {
      const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, po.id));
      ordered += lines.reduce((sum, line) => sum + line.orderedQty, 0);
      received += lines.reduce((sum, line) => sum + line.receivedQty, 0);
    }
    const fillRate = ordered ? received / ordered : 0;
    const onTimeRate = pos.length ? pos.filter((po) => ['RECEIVED', 'PARTIALLY_RECEIVED'].includes(po.status)).length / pos.length : 0;
    const score = (fillRate * 70 + onTimeRate * 30).toFixed(2);
    await db.insert(supplierScorecards).values({
      supplierId: supplier.id,
      periodStart,
      periodEnd,
      totalPos: pos.length,
      onTimeRate: onTimeRate.toFixed(4),
      fillRate: fillRate.toFixed(4),
      costVarianceRate: '0.0000',
      score,
      detailJson: { ordered, received },
    });
    created += 1;
  }
  return { created };
}
