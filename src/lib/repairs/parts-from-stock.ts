import { and, eq } from 'drizzle-orm';
import {
  db,
  branches,
  products,
  productVariants,
  repairJobs,
} from '@/db';
import { dispatchStockLowIfNeeded } from '@/lib/inventory/stock-low-alert';
import { recordRepairParts } from '@/lib/inventory/stock-service';

export type RepairPartLine = {
  id: string;
  productId: string;
  variantId?: string | null;
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  addedAt: string;
};

export function getPartsLines(checklist: Record<string, unknown> | null | undefined): RepairPartLine[] {
  const raw = checklist?.partsLines;
  if (!Array.isArray(raw)) return [];
  return raw.filter((line): line is RepairPartLine => Boolean(line && typeof line === 'object' && 'productId' in line));
}

export function sumPartsAmount(lines: RepairPartLine[]): number {
  return lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0);
}

async function resolveBranchId(): Promise<string> {
  const [branch] = await db.select({ id: branches.id }).from(branches).limit(1);
  if (!branch) throw new Error('No branch configured for stock deduction');
  return branch.id;
}

export async function addRepairPartFromStock(input: {
  repairJobId: string;
  productId: string;
  variantId?: string | null;
  qty: number;
  actorId?: string | null;
}) {
  const qty = Math.max(1, Math.floor(Number(input.qty) || 1));
  const branchId = await resolveBranchId();

  return db.transaction(async (tx) => {
    const [job] = await tx.select().from(repairJobs).where(eq(repairJobs.id, input.repairJobId)).limit(1);
    if (!job) throw new Error('Repair job not found');
    if (job.status === 'DELIVERED' || job.status === 'CANCELLED') {
      throw new Error('Cannot add parts to a closed repair job');
    }

    const [product] = await tx.select().from(products).where(eq(products.id, input.productId)).limit(1);
    if (!product || !product.isActive) throw new Error('Product not found or inactive');

    let variant: typeof productVariants.$inferSelect | null = null;
    if (input.variantId) {
      const [v] = await tx
        .select()
        .from(productVariants)
        .where(and(eq(productVariants.id, input.variantId), eq(productVariants.productId, product.id)))
        .limit(1);
      if (!v) throw new Error('Variant not found for product');
      variant = v;
    }

    const unitPrice = Number(variant?.salePrice ?? product.salePrice ?? 0);
    const unitCost = Number(variant?.costPrice ?? product.costPrice ?? 0);
    const lineTotal = unitPrice * qty;

    const { onHand } = await recordRepairParts(
      tx,
      { locationType: 'BRANCH', locationId: branchId },
      {
        productId: product.id,
        variantId: input.variantId || null,
        quantity: qty,
        unitCost,
      },
      {
        referenceType: 'REPAIR',
        referenceId: job.jobNumber,
        actorId: input.actorId || null,
        notes: `Repair parts — ${job.jobNumber}`,
      },
    );

    const existing = getPartsLines(job.checklistJson);
    const line: RepairPartLine = {
      id: `rpl_${Date.now()}`,
      productId: product.id,
      variantId: input.variantId || null,
      name: variant ? `${product.name} — ${variant.name}` : product.name,
      sku: variant?.sku || product.sku,
      qty,
      unitPrice,
      lineTotal,
      addedAt: new Date().toISOString(),
    };
    const partsLines = [...existing, line];
    const partsAmount = sumPartsAmount(partsLines);
    const partsDescription = partsLines.map((p) => `${p.name} ×${p.qty}`).join(', ');

    const [updated] = await tx
      .update(repairJobs)
      .set({
        checklistJson: { ...job.checklistJson, partsLines },
        partsAmount: partsAmount.toFixed(2),
        partsDescription,
        updatedAt: new Date(),
      })
      .where(eq(repairJobs.id, job.id))
      .returning();

    void dispatchStockLowIfNeeded({
      productId: product.id,
      productName: product.name,
      sku: line.sku,
      onHand: Number(onHand),
      reorderLevel: product.reorderLevel ?? 10,
    });

    return { job: updated!, line, partsLines };
  });
}
