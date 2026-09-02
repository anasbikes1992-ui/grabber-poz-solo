import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, productVariants, products, purchaseOrderLines, purchaseOrders } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { buildMatrixPoLines, matrixPoSummary } from '@/lib/purchasing/matrix-po';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

/** Bulk matrix PO — sizes × colors grid → variant PO lines */
export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const supplierId = body.supplierId as string;
    const warehouseId = body.warehouseId as string;
    const productId = body.productId as string;
    const sizes = (body.sizes || []) as string[];
    const colors = (body.colors || []) as string[];
    const grid = (body.grid || {}) as Record<string, number>;
    const unitCost = Number(body.unitCost || 0);

    if (!supplierId || !warehouseId || !productId || !sizes.length || !colors.length) {
      return NextResponse.json(
        { success: false, error: 'supplierId, warehouseId, productId, sizes, colors required' },
        { status: 400 },
      );
    }

    const matrixLines = buildMatrixPoLines(sizes, colors, grid, unitCost);
    const summary = matrixPoSummary(matrixLines);
    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, productId));

    const resolveVariant = (size: string, color: string) =>
      variants.find((v) => {
        const attrs = v.attributesJson as { Size?: string; Color?: string } | null;
        return attrs?.Size === size && attrs?.Color === color;
      });

    const poNumber = body.poNumber || `PO-MX-${Date.now().toString().slice(-6)}`;
    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;

    const po = await db.transaction(async (tx) => {
      const [header] = await tx
        .insert(purchaseOrders)
        .values({
          poNumber,
          supplierId,
          warehouseId,
          status: 'APPROVED',
          totalAmount: String(summary.totalCost.toFixed(2)),
          createdBy: actorId || null,
        })
        .returning();

      for (const line of matrixLines) {
        const variant = resolveVariant(line.size, line.color);
        const [prod] = await tx.select().from(products).where(eq(products.id, productId)).limit(1);
        await tx.insert(purchaseOrderLines).values({
          poId: header.id,
          productId,
          variantId: variant?.id || null,
          orderedQty: line.quantity,
          receivedQty: 0,
          unitCost: line.unitCost.toFixed(2),
          totalCost: (line.unitCost * line.quantity).toFixed(2),
        });
        void prod;
      }
      return header;
    });

    return NextResponse.json({
      success: true,
      purchaseOrder: po,
      summary,
      matrixLines,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
