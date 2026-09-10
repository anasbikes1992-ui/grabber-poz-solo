/**
 * VERT-S02 — Complete appointment → POS charge + optional consumable BOM.
 */
import { eq } from 'drizzle-orm';
import { db, appointments, products } from '@/db';
import { processPosCheckout } from '@/lib/commerce/pos-checkout-service';
import { depleteRecipeForProduct } from '@/lib/restaurant/recipe-bom';
import { resolveServiceProductId } from '@/lib/salon/service-catalog';

export async function completeAppointmentAndCharge(input: {
  appointmentId: string;
  productId?: string | null;
  paymentMethod?: string;
  actorId?: string;
  commissionPct?: number | null;
  attachProducts?: Array<{ productId: string; quantity: number; unitPrice: number; name: string; unitCost?: number }>;
}) {
  const [appt] = await db.select().from(appointments).where(eq(appointments.id, input.appointmentId)).limit(1);
  if (!appt) throw Object.assign(new Error('Appointment not found'), { status: 404 });

  const productId = await resolveServiceProductId(appt.service, input.productId);
  if (!productId) {
    throw Object.assign(
      new Error(`No SERVICE product matched for "${appt.service}" — seed salon preset or pass productId`),
      { status: 400 },
    );
  }

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  const fee = Number(appt.fee || product?.salePrice || 0);

  const checkoutItems = [
    {
      productId,
      quantity: 1,
      unitPrice: fee,
      name: product?.name || appt.service,
      unitCost: Number(product?.costPrice || 0),
    },
    ...(input.attachProducts || []).map((p) => ({
      productId: p.productId,
      quantity: Number(p.quantity) || 1,
      unitPrice: Number(p.unitPrice) || 0,
      name: p.name,
      unitCost: Number(p.unitCost) || 0,
    })),
  ];

  const checkout = await processPosCheckout({
    channel: 'POS',
    items: checkoutItems,
    paymentMethod: input.paymentMethod || 'CASH',
    actorId: input.actorId,
    allowStockUnderrun: true,
    idempotencyKey: `appt-complete-${appt.id}`,
  });

  await db.transaction(async (tx) => {
    await depleteRecipeForProduct(tx, productId, 1, appt.id);
  });

  const { resolveCommissionPct, computeCommissionAmount } = await import('@/lib/salon/commission');
  const commissionPct = resolveCommissionPct(appt.specialist, input.commissionPct);
  const commissionAmount = computeCommissionAmount(fee, commissionPct);

  const [updated] = await db
    .update(appointments)
    .set({
      status: 'COMPLETED',
      commissionPct: commissionPct.toFixed(2),
      commissionAmount: commissionAmount.toFixed(2),
      notes: [appt.notes, `Charged ${checkout.orderNumber}`, `Commission LKR ${commissionAmount.toFixed(2)} (${commissionPct}%)`]
        .filter(Boolean)
        .join(' · '),
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appt.id))
    .returning();

  return {
    appointment: updated,
    orderNumber: checkout.orderNumber,
    grandTotal: checkout.grandTotal,
    order: checkout.order,
    productId,
    commissionPct,
    commissionAmount,
  };
}
