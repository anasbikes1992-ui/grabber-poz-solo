import { eq } from 'drizzle-orm';
import { products, serialNumbers, stockBalances, tradeInVouchers } from '@/db/schema';
import { recordAdjustment } from '@/lib/inventory/stock-service';
import { appraiseTradeIn, CONDITION_GRADES, type ConditionGrade } from '@/lib/trade-in/trade-in-appraisal';

export { CONDITION_GRADES, appraiseTradeIn, type ConditionGrade };

export type TradeInInput = {
  deviceModel: string;
  imei?: string;
  conditionGrade: ConditionGrade;
  baseValue: number;
  customerName?: string;
  customerPhone?: string;
  preOwnedProductId?: string;
  locationType?: 'BRANCH' | 'WAREHOUSE';
  locationId: string;
  actorId?: string;
};

export async function issueTradeInVoucher(
  db: {
    transaction: typeof import('@/db').db.transaction;
    select: typeof import('@/db').db.select;
  },
  input: TradeInInput,
) {
  const appraisalValue = appraiseTradeIn(input.baseValue, input.conditionGrade);
  const voucherNumber = `TI-${Date.now().toString().slice(-8)}`;

  return db.transaction(async (tx) => {
    let productId = input.preOwnedProductId;
    if (!productId) {
      const sku = `PREOWN-${Date.now().toString().slice(-6)}`;
      const [prod] = await tx
        .insert(products)
        .values({
          name: `Pre-owned: ${input.deviceModel}`,
          slug: `preowned-${Date.now()}`,
          sku,
          barcode: sku,
          salePrice: String(Math.round(appraisalValue * 1.25)),
          costPrice: String(appraisalValue.toFixed(2)),
          isActive: true,
        })
        .returning();
      productId = prod.id;
    }

    const [voucher] = await tx
      .insert(tradeInVouchers)
      .values({
        voucherNumber,
        deviceModel: input.deviceModel,
        imei: input.imei?.trim().toUpperCase() || null,
        conditionGrade: input.conditionGrade,
        appraisalValue: String(appraisalValue.toFixed(2)),
        productId,
        customerName: input.customerName || null,
        customerPhone: input.customerPhone || null,
        status: 'ISSUED',
        createdBy: input.actorId || null,
      })
      .returning();

    await recordAdjustment(
      tx,
      { locationType: input.locationType || 'BRANCH', locationId: input.locationId },
      { productId, quantity: 1, unitCost: appraisalValue },
      {
        referenceType: 'TRADE_IN',
        referenceId: voucher.id,
        notes: `Trade-in ${input.conditionGrade} grade`,
        actorId: input.actorId,
      },
    );

    if (input.imei) {
      await tx
        .insert(serialNumbers)
        .values({
          serial: input.imei.trim().toUpperCase(),
          productId,
          status: 'IN_STOCK',
          locationType: input.locationType || 'BRANCH',
          locationId: input.locationId,
        })
        .onConflictDoNothing();
    }

    return { voucher, appraisalValue, productId };
  });
}

export async function applyTradeInCredit(
  db: { update: typeof import('@/db').db.update; select: typeof import('@/db').db.select },
  voucherNumber: string,
  orderId: string,
) {
  const [v] = await db
    .select()
    .from(tradeInVouchers)
    .where(eq(tradeInVouchers.voucherNumber, voucherNumber))
    .limit(1);
  if (!v || v.status !== 'ISSUED') return null;
  await db
    .update(tradeInVouchers)
    .set({ status: 'APPLIED', appliedOrderId: orderId })
    .where(eq(tradeInVouchers.id, v.id));
  return { creditAmount: Number(v.appraisalValue), voucherId: v.id };
}
