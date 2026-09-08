import { eq, desc } from 'drizzle-orm';
import { db, quotations } from '@/db';
import { convertQuoteToOrder } from '@/lib/quotations/convert-to-order';
import { createQuotationDb, issueQuotationDb, listQuotationsDb } from '@/lib/quotations/quote-service';

export const QUOTE_STATUSES = ['DRAFT', 'ISSUED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'] as const;

export async function listQuotationsForApi() {
  const rows = await listQuotationsDb();
  return rows.map((q) => ({
    ...q,
    id: q.id,
    quoteNo: q.quoteNumber,
    clientName: q.customerName,
    clientPhone: q.customerPhone,
    lines: q.linesJson,
    validUntil: q.expiresAt ? q.expiresAt.toISOString().slice(0, 10) : null,
  }));
}

export async function handleQuotationPost(body: Record<string, unknown>, actorId?: string) {
  if (body.action === 'issue' && body.quoteId) {
    const quote = await issueQuotationDb(String(body.quoteId));
    return { quote };
  }

  const rawLines = Array.isArray(body.lines) ? body.lines : [];
  const lines = rawLines.map((l: { productId?: string; variantId?: string; name?: string; qty?: number; price?: number; unitPrice?: number }) => ({
    productId: l.productId,
    variantId: l.variantId,
    name: String(l.name || 'Item'),
    qty: Math.max(1, Number(l.qty || 1)),
    unitPrice: Math.max(0, Number(l.unitPrice ?? l.price ?? 0)),
  }));

  const quote = await createQuotationDb({
    customerName: String(body.clientName || body.customerName || 'B2B Client').trim(),
    customerPhone: body.clientPhone ? String(body.clientPhone).trim() : undefined,
    customerId: body.customerId ? String(body.customerId) : undefined,
    lines,
    createdBy: actorId,
  });

  return {
    quote: {
      ...quote,
      id: quote.id,
      quoteNo: quote.quoteNumber,
      clientName: quote.customerName,
      lines: quote.linesJson,
      status: quote.status,
    },
  };
}

export async function handleQuotationPatch(
  body: Record<string, unknown>,
  actorId: string | null,
) {
  if (!body.id) {
    throw Object.assign(new Error('id required'), { status: 400 });
  }

  const [existingDb] = await db.select().from(quotations).where(eq(quotations.id, String(body.id))).limit(1);
  if (!existingDb) {
    throw Object.assign(new Error('Quote not found'), { status: 404 });
  }

  if (body.action === 'issue') {
    const quote = await issueQuotationDb(String(body.id));
    return { quote };
  }

  if (body.action === 'convert_to_order') {
    if (existingDb.status === 'CONVERTED') {
      throw Object.assign(new Error('Quote already converted'), { status: 409 });
    }
    const order = await convertQuoteToOrder(
      {
        id: existingDb.id,
        quoteNumber: existingDb.quoteNumber,
        customerName: existingDb.customerName,
        customerPhone: existingDb.customerPhone || undefined,
        customerId: existingDb.customerId,
        linesJson: existingDb.linesJson,
        subtotal: Number(existingDb.subtotal),
        grandTotal: Number(existingDb.subtotal),
      },
      actorId,
    );
    const [quote] = await db.select().from(quotations).where(eq(quotations.id, existingDb.id)).limit(1);
    return { quote, order };
  }

  if (body.action === 'update_status') {
    const status = String(body.status || '').toUpperCase();
    if (!QUOTE_STATUSES.includes(status as (typeof QUOTE_STATUSES)[number])) {
      throw Object.assign(new Error('Invalid status'), { status: 400 });
    }
    if (existingDb.status === 'CONVERTED') {
      throw Object.assign(new Error('Converted quotes are locked'), { status: 409 });
    }
    const [quote] = await db
      .update(quotations)
      .set({ status, updatedAt: new Date() })
      .where(eq(quotations.id, existingDb.id))
      .returning();
    return { quote };
  }

  const [quote] = await db
    .update(quotations)
    .set({
      customerName: body.clientName ? String(body.clientName).trim() : existingDb.customerName,
      customerPhone: body.clientPhone ? String(body.clientPhone).trim() : existingDb.customerPhone,
      updatedAt: new Date(),
    })
    .where(eq(quotations.id, existingDb.id))
    .returning();

  return { quote };
}

export async function deleteQuotationById(id: string) {
  await db.delete(quotations).where(eq(quotations.id, id));
}
