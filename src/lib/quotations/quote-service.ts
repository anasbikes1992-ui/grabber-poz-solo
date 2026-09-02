import { eq, inArray, desc } from 'drizzle-orm';
import { db, quotations, customers, polimPothaAccounts } from '@/db';
import { reserveStock } from '@/lib/inventory/stock-reservation';
import { enqueueJob } from '@/lib/jobs/outbox';

export type QuoteLine = {
  productId?: string;
  variantId?: string;
  name: string;
  qty: number;
  unitPrice: number;
};

export async function listQuotationsDb() {
  return db.select().from(quotations).orderBy(desc(quotations.createdAt));
}

async function checkCreditLimit(customerId: string | null, quoteTotal: number) {
  if (!customerId || quoteTotal <= 0) return;
  const [acct] = await db.select().from(polimPothaAccounts).where(eq(polimPothaAccounts.customerId, customerId)).limit(1);
  if (!acct) return;
  const projected = Number(acct.currentBalance) + quoteTotal;
  if (projected > Number(acct.creditLimit)) {
    throw new Error(`Credit limit exceeded: available ${Number(acct.creditLimit) - Number(acct.currentBalance)} LKR`);
  }
}

export async function createQuotationDb(input: {
  customerName: string;
  customerPhone?: string;
  customerId?: string;
  lines: QuoteLine[];
  createdBy?: string;
}) {
  const subtotal = input.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const quoteNumber = `QT-${Date.now().toString().slice(-6)}`;
  const [row] = await db
    .insert(quotations)
    .values({
      quoteNumber,
      customerId: input.customerId || null,
      customerName: input.customerName,
      customerPhone: input.customerPhone || null,
      status: 'DRAFT',
      linesJson: input.lines,
      subtotal: String(subtotal.toFixed(2)),
      expiresAt: new Date(Date.now() + 14 * 86400000),
      createdBy: input.createdBy || null,
    })
    .returning();
  return row;
}

export async function issueQuotationDb(quoteId: string) {
  const [quote] = await db.select().from(quotations).where(eq(quotations.id, quoteId)).limit(1);
  if (!quote) throw new Error('Quote not found');

  await checkCreditLimit(quote.customerId, Number(quote.subtotal));

  const lines = (quote.linesJson as QuoteLine[]) || [];
  for (const line of lines) {
    if (!line.productId) continue;
    await reserveStock({
      productId: line.productId,
      variantId: line.variantId,
      qty: line.qty,
      referenceType: 'QUOTATION',
      referenceId: quote.id,
    });
  }

  const reservationExpiresAt = new Date(Date.now() + 48 * 3600000);
  const [updated] = await db
    .update(quotations)
    .set({
      status: 'ISSUED',
      reservationExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(quotations.id, quoteId))
    .returning();

  await enqueueJob({
    type: 'QUOTE_RESERVATION_EXPIRE',
    idempotencyKey: `quote_exp_${quoteId}`,
    payload: {
      quoteId,
      lines: lines.filter((l) => l.productId).map((l) => ({ productId: l.productId!, variantId: l.variantId, qty: l.qty })),
    },
    scheduledAt: reservationExpiresAt,
  });

  return updated;
}

export async function findCustomerByPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const [cust] = await db.select().from(customers).where(eq(customers.phone, digits)).limit(1);
  return cust;
}

export async function listExpiringReservations() {
  return db
    .select()
    .from(quotations)
    .where(inArray(quotations.status, ['ISSUED', 'ACCEPTED']));
}
