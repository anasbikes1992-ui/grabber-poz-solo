import { desc, eq, sql } from 'drizzle-orm';
import { db, pharmacistApprovals, prescriptionLines, prescriptions } from '@/db';
import { assertCanDispense, canTransitionRx } from './status';

export type RxLineInput = {
  productId?: string | null;
  variantId?: string | null;
  productName: string;
  qty?: number;
  dosageText?: string | null;
  lotPreference?: string | null;
  controlled?: boolean;
};

function actorId(userId?: string | null): string | null {
  if (!userId || userId === '00000000-0000-0000-0000-000000000001') return null;
  return userId;
}

async function nextRxNumber(): Promise<string> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(prescriptions);
  return `RX-${String((count || 0) + 1).padStart(5, '0')}`;
}

export async function createPrescription(input: {
  customerName: string;
  customerPhone?: string | null;
  customerId?: string | null;
  doctorName?: string | null;
  notes?: string | null;
  lines?: RxLineInput[];
  createdBy?: string | null;
}) {
  const customerName = String(input.customerName || '').trim() || 'Walk-in';
  const prescriptionNumber = await nextRxNumber();

  return db.transaction(async (tx) => {
    const [rx] = await tx
      .insert(prescriptions)
      .values({
        prescriptionNumber,
        customerName,
        customerPhone: input.customerPhone || null,
        customerId: input.customerId || null,
        doctorName: input.doctorName || null,
        notes: input.notes || null,
        status: 'DRAFT',
        createdBy: actorId(input.createdBy),
      })
      .returning();

    const lines = (input.lines || []).filter((l) => String(l.productName || '').trim());
    if (lines.length > 0) {
      await tx.insert(prescriptionLines).values(
        lines.map((l) => ({
          prescriptionId: rx.id,
          productId: l.productId || null,
          variantId: l.variantId || null,
          productName: String(l.productName).trim(),
          qty: Math.max(1, Number(l.qty) || 1),
          dosageText: l.dosageText || null,
          lotPreference: l.lotPreference || null,
          controlled: Boolean(l.controlled),
        })),
      );
    }

    const savedLines = await tx
      .select()
      .from(prescriptionLines)
      .where(eq(prescriptionLines.prescriptionId, rx.id));

    return { ...rx, lines: savedLines };
  });
}

export async function listPrescriptions(limit = 100) {
  const rows = await db.select().from(prescriptions).orderBy(desc(prescriptions.createdAt)).limit(limit);
  const withLines = [];
  for (const rx of rows) {
    const lines = await db
      .select()
      .from(prescriptionLines)
      .where(eq(prescriptionLines.prescriptionId, rx.id));
    withLines.push({ ...rx, lines });
  }
  return withLines;
}

export async function submitForApproval(id: string) {
  const [rx] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!rx) throw new Error('Prescription not found');
  if (!canTransitionRx(rx.status, 'PENDING_APPROVAL')) {
    throw new Error(`Cannot submit prescription in status ${rx.status}`);
  }
  const lines = await db
    .select()
    .from(prescriptionLines)
    .where(eq(prescriptionLines.prescriptionId, id));
  if (lines.length === 0) throw new Error('Add at least one prescription line before submit');

  const [updated] = await db
    .update(prescriptions)
    .set({ status: 'PENDING_APPROVAL', updatedAt: new Date() })
    .where(eq(prescriptions.id, id))
    .returning();
  return updated;
}

export async function approvePrescription(
  id: string,
  opts: { approverUserId?: string | null; notes?: string | null; decision?: 'APPROVED' | 'REJECTED' } = {},
) {
  const [rx] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!rx) throw new Error('Prescription not found');

  const decision = opts.decision || 'APPROVED';
  const nextStatus = decision === 'APPROVED' ? 'APPROVED' : 'CANCELLED';

  if (!canTransitionRx(rx.status, nextStatus)) {
    throw new Error(`Cannot ${decision.toLowerCase()} prescription in status ${rx.status}`);
  }

  return db.transaction(async (tx) => {
    await tx.insert(pharmacistApprovals).values({
      prescriptionId: id,
      approverUserId: actorId(opts.approverUserId),
      decision,
      notes: opts.notes || null,
    });

    const [updated] = await tx
      .update(prescriptions)
      .set({
        status: nextStatus,
        pharmacistUserId: actorId(opts.approverUserId),
        updatedAt: new Date(),
      })
      .where(eq(prescriptions.id, id))
      .returning();

    return updated;
  });
}

export async function dispensePrescription(id: string) {
  const [rx] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!rx) throw new Error('Prescription not found');
  assertCanDispense(rx.status);
  if (!canTransitionRx(rx.status, 'DISPENSED')) {
    throw new Error(`Cannot dispense prescription in status ${rx.status}`);
  }
  const [updated] = await db
    .update(prescriptions)
    .set({ status: 'DISPENSED', updatedAt: new Date() })
    .where(eq(prescriptions.id, id))
    .returning();
  return updated;
}

export async function cancelPrescription(id: string) {
  const [rx] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1);
  if (!rx) throw new Error('Prescription not found');
  if (!canTransitionRx(rx.status, 'CANCELLED')) {
    throw new Error(`Cannot cancel prescription in status ${rx.status}`);
  }
  const [updated] = await db
    .update(prescriptions)
    .set({ status: 'CANCELLED', updatedAt: new Date() })
    .where(eq(prescriptions.id, id))
    .returning();
  return updated;
}
