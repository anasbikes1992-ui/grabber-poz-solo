import { eq } from 'drizzle-orm';
import {
  branches,
  controlledDrugLogs,
  db,
  prescriptionLines,
  prescriptions,
  productVariants,
  stockLots,
} from '@/db';
import { consumeFefoLot } from '@/lib/inventory/fefo';
import { assertCanDispense, canTransitionRx } from './status';

function actorId(userId?: string | null): string | null {
  if (!userId || userId === '00000000-0000-0000-0000-000000000001') return null;
  return userId;
}

function isControlledProduct(attrs: Record<string, string> | null | undefined, lineControlled: boolean) {
  if (lineControlled) return true;
  if (!attrs) return false;
  const flag = String(attrs.controlled || attrs.Controlled || attrs.schedule || '').toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes' || flag.startsWith('sch');
}

async function defaultBranchId(): Promise<string> {
  const [b] = await db.select().from(branches).where(eq(branches.active, true)).limit(1);
  if (!b) throw new Error('No active branch — create a branch before FEFO dispense');
  return b.id;
}

/**
 * Dispense with FEFO lot consumption + controlled-drug audit log.
 */
export async function dispensePrescriptionWithFefo(
  id: string,
  opts: { pharmacistUserId?: string | null; branchId?: string | null } = {},
) {
  const [rx] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!rx) throw new Error('Prescription not found');
  assertCanDispense(rx.status);
  if (!canTransitionRx(rx.status, 'DISPENSED')) {
    throw new Error(`Cannot dispense prescription in status ${rx.status}`);
  }

  const lines = await db.select().from(prescriptionLines).where(eq(prescriptionLines.prescriptionId, id));
  if (lines.length === 0) throw new Error('No lines to dispense');

  const branchId = opts.branchId || (await defaultBranchId());
  const loc = { locationType: 'BRANCH' as const, locationId: branchId };

  return db.transaction(async (tx) => {
    for (const line of lines) {
      let lotId: string | null = null;
      let productAttrs: Record<string, string> | null = null;

      if (line.variantId) {
        const [v] = await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, line.variantId))
          .limit(1);
        productAttrs = (v?.attributesJson as Record<string, string>) || null;
      }

      if (line.productId) {
        lotId = await consumeFefoLot(tx, loc, line.productId, line.variantId, line.qty);

        if (isControlledProduct(productAttrs, line.controlled) && !lotId) {
          throw new Error(
            `Controlled item "${line.productName}" requires a FEFO lot with stock — receive a batch first`,
          );
        }

        if (lotId) {
          const [lot] = await tx.select().from(stockLots).where(eq(stockLots.id, lotId)).limit(1);
          await tx
            .update(prescriptionLines)
            .set({
              dispensedLotId: lotId,
              lotPreference: lot?.batchCode || line.lotPreference,
            })
            .where(eq(prescriptionLines.id, line.id));
        }
      }

      if (isControlledProduct(productAttrs, line.controlled)) {
        await tx.insert(controlledDrugLogs).values({
          prescriptionId: id,
          prescriptionLineId: line.id,
          productId: line.productId || null,
          productName: line.productName,
          qty: line.qty,
          lotId,
          customerName: rx.customerName,
          pharmacistUserId: actorId(opts.pharmacistUserId),
          notes: line.dosageText || null,
        });
      }
    }

    const [updated] = await tx
      .update(prescriptions)
      .set({
        status: 'DISPENSED',
        pharmacistUserId: actorId(opts.pharmacistUserId) || rx.pharmacistUserId,
        updatedAt: new Date(),
      })
      .where(eq(prescriptions.id, id))
      .returning();

    return updated;
  });
}
