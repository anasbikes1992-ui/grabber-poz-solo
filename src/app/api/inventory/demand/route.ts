import { NextResponse } from 'next/server';
import { desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import {
  auditLogs,
  db,
  forecastItems,
  forecastRuns,
  orderItems,
  orders,
  products,
  replenishmentRecommendations,
  skuClassifications,
  stockBalances,
} from '@/db';
import { assertRole, requireActiveStaffSession } from '@/lib/auth/session';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';
import { completedOrderFilter, daysAgo } from '@/lib/commerce/sales-metrics';

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'] as const;

const querySchema = z.object({
  lookbackDays: z.coerce.number().int().min(7).max(180).default(30),
  leadTimeDays: z.coerce.number().int().min(1).max(90).default(7),
});

type Risk = 'HIGH' | 'MEDIUM' | 'LOW';

type DemandItem = {
  productId: string;
  sku: string;
  name: string;
  demandQty: number;
  revenue: number;
  avgDailyDemand: number;
  onHand: number;
  reserved: number;
  available: number;
  safetyStock: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  stockoutRisk: Risk;
  abcClass: 'A' | 'B' | 'C';
  xyzClass: 'X' | 'Y' | 'Z';
  classification: string;
  reason: string;
};

async function requireDemandPlanner() {
  const session = await requireActiveStaffSession();
  return assertRole(session, [...ALLOWED_ROLES]);
}

function isMissingPlanningSchema(error: unknown) {
  const err = error as { code?: string; message?: string };
  const message = String(err.message || '').toLowerCase();
  return err.code === '42P01' || message.includes('forecast_runs') || message.includes('forecast_items');
}

function planningSetupResponse(status = 503) {
  return NextResponse.json({
    success: status < 500,
    setupRequired: true,
    error: 'Demand planning tables are not ready',
    setupMessage: 'Run npm run db:bootstrap on this database to apply migration 0025_inventory_demand_planning.sql.',
  }, { status });
}

function parseParams(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    lookbackDays: searchParams.get('lookbackDays') || undefined,
    leadTimeDays: searchParams.get('leadTimeDays') || undefined,
  });
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

async function buildDemandPlan(input: { lookbackDays: number; leadTimeDays: number }) {
  const activeProducts = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      reorderLevel: products.reorderLevel,
      isActive: products.isActive,
    })
    .from(products);

  const orderRows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(completedOrderFilter(daysAgo(input.lookbackDays)))
    .orderBy(desc(orders.createdAt))
    .limit(5000);

  const orderIds = orderRows.map((order) => order.id);
  const salesRows = orderIds.length
    ? await db
        .select({
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          lineTotal: orderItems.lineTotal,
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds))
    : [];

  const stockRows = await db
    .select({
      productId: stockBalances.productId,
      onHand: stockBalances.onHand,
      reserved: stockBalances.reserved,
    })
    .from(stockBalances);

  const demandByProduct = new Map<string, { qty: number; revenue: number }>();
  for (const row of salesRows) {
    const current = demandByProduct.get(row.productId) || { qty: 0, revenue: 0 };
    current.qty += Number(row.quantity || 0);
    current.revenue += Number(row.lineTotal || 0);
    demandByProduct.set(row.productId, current);
  }

  const stockByProduct = new Map<string, { onHand: number; reserved: number }>();
  for (const row of stockRows) {
    const current = stockByProduct.get(row.productId) || { onHand: 0, reserved: 0 };
    current.onHand += Number(row.onHand || 0);
    current.reserved += Number(row.reserved || 0);
    stockByProduct.set(row.productId, current);
  }

  const totalRevenue = Array.from(demandByProduct.values()).reduce((sum, item) => sum + item.revenue, 0);
  const revenueRanks = Array.from(demandByProduct.entries())
    .map(([productId, item]) => ({ productId, revenue: item.revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const abcByProduct = new Map<string, 'A' | 'B' | 'C'>();
  let cumulativeRevenue = 0;
  for (const rank of revenueRanks) {
    cumulativeRevenue += rank.revenue;
    const share = totalRevenue > 0 ? cumulativeRevenue / totalRevenue : 1;
    abcByProduct.set(rank.productId, share <= 0.8 ? 'A' : share <= 0.95 ? 'B' : 'C');
  }

  const items: DemandItem[] = activeProducts
    .filter((product) => product.isActive)
    .map((product) => {
      const demand = demandByProduct.get(product.id) || { qty: 0, revenue: 0 };
      const stock = stockByProduct.get(product.id) || { onHand: 0, reserved: 0 };
      const avgDailyDemand = demand.qty / input.lookbackDays;
      const available = stock.onHand - stock.reserved;
      const safetyStock = avgDailyDemand > 0 ? Math.ceil(Math.max(1, avgDailyDemand) * Math.sqrt(input.leadTimeDays)) : 0;
      const baseReorderPoint = Math.ceil(avgDailyDemand * input.leadTimeDays + safetyStock);
      const reorderPoint = Math.max(Number(product.reorderLevel || 0), baseReorderPoint);
      const suggestedOrderQty = Math.max(0, reorderPoint - available + Math.ceil(avgDailyDemand * input.leadTimeDays));
      const stockoutRisk: Risk = available <= 0 || (safetyStock > 0 && available <= safetyStock)
        ? 'HIGH'
        : available <= reorderPoint
          ? 'MEDIUM'
          : 'LOW';
      const abcClass: 'A' | 'B' | 'C' = abcByProduct.get(product.id) || 'C';
      const xyzClass: 'X' | 'Y' | 'Z' = demand.qty >= 30 ? 'X' : demand.qty >= 10 ? 'Y' : 'Z';
      const reason = suggestedOrderQty > 0
        ? `${stockoutRisk} risk: available ${available}, reorder point ${reorderPoint}, ${demand.qty} sold in ${input.lookbackDays} days.`
        : `Healthy coverage: available ${available}, reorder point ${reorderPoint}.`;

      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        demandQty: demand.qty,
        revenue: demand.revenue,
        avgDailyDemand,
        onHand: stock.onHand,
        reserved: stock.reserved,
        available,
        safetyStock,
        reorderPoint,
        suggestedOrderQty,
        stockoutRisk,
        abcClass,
        xyzClass,
        classification: `${abcClass}-${xyzClass}`,
        reason,
      };
    })
    .sort((a, b) => {
      const riskRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return riskRank[a.stockoutRisk] - riskRank[b.stockoutRisk]
        || b.suggestedOrderQty - a.suggestedOrderQty
        || b.revenue - a.revenue;
    });

  const recommendedItems = items.filter((item) => item.suggestedOrderQty > 0 || item.stockoutRisk !== 'LOW');
  const summary = {
    generatedAt: new Date().toISOString(),
    lookbackDays: input.lookbackDays,
    leadTimeDays: input.leadTimeDays,
    monitoredSkus: items.length,
    recommendedSkus: recommendedItems.length,
    highRiskSkus: items.filter((item) => item.stockoutRisk === 'HIGH').length,
    projectedOrderUnits: recommendedItems.reduce((sum, item) => sum + item.suggestedOrderQty, 0),
    sourceOrders: orderRows.length,
  };

  return { summary, items: recommendedItems, allItems: items };
}

function serializeItem(item: DemandItem) {
  return {
    ...item,
    avgDailyDemand: Number(item.avgDailyDemand.toFixed(4)),
  };
}

export async function GET(req: Request) {
  try {
    await requireDemandPlanner();
    const params = parseParams(req);
    const plan = await buildDemandPlan(params);
    return NextResponse.json({
      success: true,
      summary: plan.summary,
      items: plan.items.map(serializeItem),
      allItems: plan.allItems.map(serializeItem),
      readOnly: true,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) return validationErrorResponse(err.issues[0]?.message || 'Invalid demand planning query');
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Unauthorized' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not load demand plan', logMessage: 'Demand plan load failed' });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireDemandPlanner();
    const body = querySchema.safeParse(await req.json().catch(() => ({})));
    if (!body.success) return validationErrorResponse(body.error.issues[0]?.message || 'Invalid demand planning request');

    const plan = await buildDemandPlan(body.data);
    const [run] = await db
      .insert(forecastRuns)
      .values({
        status: 'COMPLETED',
        method: 'DETERMINISTIC_BASELINE',
        lookbackDays: body.data.lookbackDays,
        leadTimeDays: body.data.leadTimeDays,
        serviceLevel: 'MEDIUM',
        summaryJson: plan.summary,
        createdBy: session.userId,
      })
      .returning();

    const insertedItems = plan.items.length
      ? await db
          .insert(forecastItems)
          .values(plan.items.map((item) => ({
            runId: run.id,
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            avgDailyDemand: item.avgDailyDemand.toFixed(4),
            demand30d: item.demandQty,
            onHand: item.onHand,
            reserved: item.reserved,
            available: item.available,
            safetyStock: item.safetyStock,
            reorderPoint: item.reorderPoint,
            suggestedOrderQty: item.suggestedOrderQty,
            stockoutRisk: item.stockoutRisk,
            classification: item.classification,
          })))
          .returning()
      : [];

    const totalPlanRevenue = plan.allItems.reduce((sum, row) => sum + row.revenue, 0);
    for (const item of plan.allItems) {
      const revenueShare = totalPlanRevenue > 0 && item.revenue > 0 ? item.revenue / totalPlanRevenue : 0;
      await db
        .insert(skuClassifications)
        .values({
          productId: item.productId,
          abcClass: item.abcClass,
          xyzClass: item.xyzClass,
          velocityScore: item.avgDailyDemand.toFixed(4),
          revenueShare: revenueShare.toFixed(4),
          demandCv: '0.0000',
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: skuClassifications.productId,
          set: {
            abcClass: item.abcClass,
            xyzClass: item.xyzClass,
            velocityScore: item.avgDailyDemand.toFixed(4),
            revenueShare: revenueShare.toFixed(4),
            demandCv: '0.0000',
            updatedAt: new Date(),
          },
        });
    }

    const itemByProduct = new Map(insertedItems.map((item) => [item.productId, item.id]));
    const recommendationRows = plan.items
      .filter((item) => item.suggestedOrderQty > 0)
      .map((item) => ({
        forecastItemId: itemByProduct.get(item.productId) || null,
        productId: item.productId,
        status: 'DRAFT',
        suggestedOrderQty: item.suggestedOrderQty,
        reason: item.reason,
      }));

    if (recommendationRows.length) {
      await db.insert(replenishmentRecommendations).values(recommendationRows);
    }

    await db.insert(auditLogs).values({
      actorId: session.userId,
      actorRole: session.role,
      action: 'DEMAND_FORECAST_SNAPSHOT_CREATED',
      entity: 'forecast_run',
      entityId: run.id,
      riskLevel: 'DRAFT',
      afterState: plan.summary,
    });

    return NextResponse.json({
      success: true,
      forecastRunId: run.id,
      summary: plan.summary,
      items: plan.items.map(serializeItem),
    });
  } catch (err: unknown) {
    if (isMissingPlanningSchema(err)) return planningSetupResponse(503);
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not save demand forecast', logMessage: 'Demand forecast save failed' });
  }
}
