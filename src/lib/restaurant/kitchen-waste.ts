/**
 * VERT-R03 — Kitchen waste → damages (stock + GL on approve).
 */
import { eq } from 'drizzle-orm';
import { db, damages, branches, products } from '@/db';
import { postDamageWriteOff } from '@/lib/damages/damage-write-off';
import { recordDamage } from '@/lib/inventory/stock-service';
import { isDemoUserId } from '@/lib/auth/session';

export const KITCHEN_WASTE_REASON = 'KITCHEN_WASTE';

export async function reportKitchenWaste(input: {
  productId: string;
  quantity: number;
  remarks?: string;
  autoApprove?: boolean;
  actorId?: string | null;
  actorName?: string;
}) {
  const qty = Math.max(1, Math.floor(Number(input.quantity) || 1));
  const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });

  const [branch] = await db.select({ id: branches.id }).from(branches).limit(1);
  if (!branch) throw Object.assign(new Error('No branch configured'), { status: 400 });

  const unitCost = Number(product.costPrice || 0);
  const totalLoss = (qty * unitCost).toFixed(2);
  const damageNumber = `WST-${Date.now().toString().slice(-6)}`;

  const [row] = await db
    .insert(damages)
    .values({
      damageNumber,
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      locationType: 'BRANCH',
      locationId: branch.id,
      quantity: qty,
      unitCost: unitCost.toFixed(2),
      totalLoss,
      reason: KITCHEN_WASTE_REASON,
      remarks: input.remarks || 'Kitchen waste / spoilage',
      reportedBy: input.actorName || 'Kitchen',
      status: 'PENDING',
    })
    .returning();

  if (!input.autoApprove) {
    return { damage: row, approved: false };
  }

  const actorId = input.actorId && !isDemoUserId(input.actorId) ? input.actorId : null;
  await db.transaction(async (tx) => {
    await recordDamage(
      tx,
      { locationType: 'BRANCH', locationId: branch.id },
      { productId: product.id, quantity: qty },
      { referenceType: 'DAMAGE', referenceId: row.id, notes: KITCHEN_WASTE_REASON },
    );
  });

  const journalEntryId = await postDamageWriteOff({
    damageId: row.id,
    productName: product.name,
    totalLoss: Number(totalLoss),
    actorId,
  });

  const [approved] = await db
    .update(damages)
    .set({
      status: 'APPROVED',
      approvedBy: actorId,
      journalEntryId,
      updatedAt: new Date(),
    })
    .where(eq(damages.id, row.id))
    .returning();

  return { damage: approved, approved: true, journalEntryId };
}
