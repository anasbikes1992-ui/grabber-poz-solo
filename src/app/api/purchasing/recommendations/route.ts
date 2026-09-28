import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  auditLogs,
  db,
  forecastItems,
  products,
  purchaseOrderLines,
  purchaseOrders,
  replenishmentRecommendations,
  suppliers,
  warehouses,
} from '@/db';
import { assertRole, requireActiveStaffSession } from '@/lib/auth/session';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';

const REVIEW_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'] as const;
const MUTATE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;
const STATUSES = ['DRAFT', 'REVIEWED', 'APPROVED', 'REJECTED', 'PO_CREATED', 'ARCHIVED'] as const;

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES).optional(),
  supplierId: z.string().uuid().nullable().optional(),
  targetWarehouseId: z.string().uuid().nullable().optional(),
  suggestedOrderQty: z.coerce.number().int().min(1).max(1_000_000).optional(),
  unitCost: z.coerce.number().min(0).max(1_000_000_000).nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const createPoSchema = z.object({
  recommendationId: z.string().uuid(),
  supplierId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  unitCost: z.coerce.number().min(0).max(1_000_000_000),
  notes: z.string().trim().max(2000).optional(),
});

async function requireReviewer() {
  const session = await requireActiveStaffSession();
  return assertRole(session, [...REVIEW_ROLES]);
}

async function requireMutator() {
  const session = await requireActiveStaffSession();
  return assertRole(session, [...MUTATE_ROLES]);
}

function isMissingRecommendationSchema(error: unknown) {
  const err = error as { code?: string; message?: string };
  const message = String(err.message || '').toLowerCase();
  return err.code === '42P01'
    || err.code === '42703'
    || message.includes('replenishment_recommendations')
    || message.includes('supplier_id')
    || message.includes('approved_po_id');
}

function setupResponse(status = 503) {
  return NextResponse.json({
    success: status < 500,
    setupRequired: true,
    error: 'Replenishment review tables are not ready',
    setupMessage: 'Run npm run db:bootstrap to apply migrations 0025 and 0026.',
    recommendations: [],
  }, { status });
}

function money(value: unknown) {
  return Number(value || 0);
}

async function loadContext() {
  const [productRows, forecastRows, supplierRows, warehouseRows] = await Promise.all([
    db.select().from(products),
    db.select().from(forecastItems),
    db.select().from(suppliers),
    db.select().from(warehouses),
  ]);

  return {
    productsById: new Map(productRows.map((row) => [row.id, row])),
    forecastById: new Map(forecastRows.map((row) => [row.id, row])),
    suppliersById: new Map(supplierRows.map((row) => [row.id, row])),
    warehousesById: new Map(warehouseRows.map((row) => [row.id, row])),
    suppliers: supplierRows.map((row) => ({ id: row.id, name: row.name, active: row.active })),
    warehouses: warehouseRows.map((row) => ({ id: row.id, name: row.name, code: row.code, active: row.active })),
  };
}

function serializeRecommendation(
  row: typeof replenishmentRecommendations.$inferSelect,
  context: Awaited<ReturnType<typeof loadContext>>,
) {
  const product = context.productsById.get(row.productId);
  const forecast = row.forecastItemId ? context.forecastById.get(row.forecastItemId) : undefined;
  const supplier = row.supplierId ? context.suppliersById.get(row.supplierId) : undefined;
  const warehouse = row.targetWarehouseId ? context.warehousesById.get(row.targetWarehouseId) : undefined;

  return {
    id: row.id,
    forecastItemId: row.forecastItemId,
    productId: row.productId,
    productName: product?.name || forecast?.name || row.productId,
    sku: product?.sku || forecast?.sku || '',
    supplierId: row.supplierId,
    supplierName: supplier?.name || '',
    warehouseId: row.targetWarehouseId,
    warehouseName: warehouse?.name || '',
    approvedPoId: row.approvedPoId,
    status: row.status,
    suggestedOrderQty: row.suggestedOrderQty,
    unitCost: row.unitCost === null ? money(product?.costPrice) : money(row.unitCost),
    reason: row.reason,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() || null,
    available: forecast?.available ?? null,
    reorderPoint: forecast?.reorderPoint ?? null,
    stockoutRisk: forecast?.stockoutRisk || null,
    classification: forecast?.classification || null,
  };
}

export async function GET() {
  try {
    await requireReviewer();
    const [rows, context] = await Promise.all([
      db.select().from(replenishmentRecommendations).orderBy(desc(replenishmentRecommendations.createdAt)).limit(500),
      loadContext(),
    ]);

    const recommendations = rows.map((row) => serializeRecommendation(row, context));
    const stats = {
      total: recommendations.length,
      draft: recommendations.filter((row) => row.status === 'DRAFT').length,
      approved: recommendations.filter((row) => row.status === 'APPROVED').length,
      poCreated: recommendations.filter((row) => row.status === 'PO_CREATED').length,
    };

    return NextResponse.json({
      success: true,
      recommendations,
      suppliers: context.suppliers,
      warehouses: context.warehouses,
      stats,
    });
  } catch (err: unknown) {
    if (isMissingRecommendationSchema(err)) return setupResponse(200);
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Unauthorized' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not load replenishment recommendations', logMessage: 'Replenishment recommendations load failed' });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireMutator();
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid recommendation update');
    const body = parsed.data;

    const [updated] = await db
      .update(replenishmentRecommendations)
      .set({
        status: body.status,
        supplierId: body.supplierId,
        targetWarehouseId: body.targetWarehouseId,
        suggestedOrderQty: body.suggestedOrderQty,
        unitCost: body.unitCost === null || body.unitCost === undefined ? body.unitCost : body.unitCost.toFixed(2),
        notes: body.notes,
        reviewedAt: new Date(),
        reviewedBy: session.userId,
      })
      .where(eq(replenishmentRecommendations.id, body.id))
      .returning();

    if (!updated) return NextResponse.json({ success: false, error: 'Recommendation not found' }, { status: 404 });

    await db.insert(auditLogs).values({
      actorId: session.userId,
      actorRole: session.role,
      action: 'REPLENISHMENT_RECOMMENDATION_UPDATED',
      entity: 'replenishment_recommendation',
      entityId: updated.id,
      riskLevel: 'LOW_RISK_WRITE',
      afterState: {
        status: updated.status,
        supplierId: updated.supplierId,
        targetWarehouseId: updated.targetWarehouseId,
        suggestedOrderQty: updated.suggestedOrderQty,
      },
    });

    const context = await loadContext();
    return NextResponse.json({ success: true, recommendation: serializeRecommendation(updated, context) });
  } catch (err: unknown) {
    if (isMissingRecommendationSchema(err)) return setupResponse(503);
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not update recommendation', logMessage: 'Replenishment recommendation update failed' });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireMutator();
    const parsed = createPoSchema.safeParse(await req.json());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid purchase order request');
    const body = parsed.data;

    const [recommendation] = await db
      .select()
      .from(replenishmentRecommendations)
      .where(eq(replenishmentRecommendations.id, body.recommendationId))
      .limit(1);

    if (!recommendation) return NextResponse.json({ success: false, error: 'Recommendation not found' }, { status: 404 });
    if (recommendation.approvedPoId) {
      return NextResponse.json({ success: false, error: 'Recommendation already has a linked purchase order' }, { status: 409 });
    }

    const [product] = await db.select().from(products).where(eq(products.id, recommendation.productId)).limit(1);
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

    const poNumber = `PO-RPL-${Date.now().toString().slice(-8)}`;
    const total = body.quantity * body.unitCost;

    const result = await db.transaction(async (tx) => {
      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          poNumber,
          supplierId: body.supplierId,
          warehouseId: body.warehouseId,
          status: 'DRAFT',
          totalAmount: total.toFixed(2),
          createdBy: session.userId,
        })
        .returning();

      await tx.insert(purchaseOrderLines).values({
        poId: po.id,
        productId: product.id,
        orderedQty: body.quantity,
        receivedQty: 0,
        unitCost: body.unitCost.toFixed(2),
        totalCost: total.toFixed(2),
      });

      const [updated] = await tx
        .update(replenishmentRecommendations)
        .set({
          supplierId: body.supplierId,
          targetWarehouseId: body.warehouseId,
          unitCost: body.unitCost.toFixed(2),
          suggestedOrderQty: body.quantity,
          status: 'PO_CREATED',
          approvedPoId: po.id,
          notes: body.notes || recommendation.notes,
          reviewedAt: new Date(),
          reviewedBy: session.userId,
        })
        .where(eq(replenishmentRecommendations.id, recommendation.id))
        .returning();

      await tx.insert(auditLogs).values({
        actorId: session.userId,
        actorRole: session.role,
        action: 'REPLENISHMENT_DRAFT_PO_CREATED',
        entity: 'purchase_order',
        entityId: po.id,
        riskLevel: 'LOW_RISK_WRITE',
        afterState: {
          recommendationId: recommendation.id,
          poNumber,
          productId: product.id,
          quantity: body.quantity,
          unitCost: body.unitCost,
          status: 'DRAFT',
        },
      });

      return { po, recommendation: updated };
    });

    const context = await loadContext();
    return NextResponse.json({
      success: true,
      purchaseOrder: result.po,
      recommendation: serializeRecommendation(result.recommendation, context),
    });
  } catch (err: unknown) {
    if (isMissingRecommendationSchema(err)) return setupResponse(503);
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not create draft purchase order', logMessage: 'Draft PO from recommendation failed' });
  }
}
