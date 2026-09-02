import { eq } from 'drizzle-orm';
import { db, hasDatabaseUrl, quotations } from '@/db';
import { deleteCollectionItem, listCollection, upsertCollectionItem } from '@/lib/db/app-collections';
import { convertQuoteToOrder } from '@/lib/quotations/convert-to-order';
import { createQuotationDb, issueQuotationDb, listQuotationsDb } from '@/lib/quotations/quote-service';

export const QUOTE_STATUSES = ['DRAFT', 'ISSUED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'] as const;

export async function listQuotationsForApi() {
  if (hasDatabaseUrl()) {
    return (await listQuotationsDb()).map((q) => ({
      ...q,
      id: q.id,
      quoteNo: q.quoteNumber,
      clientName: q.customerName,
      lines: q.linesJson,
    }));
  }
  return listCollection<{ id: string } & Record<string, unknown>>('quotations');
}

export async function handleQuotationPost(body: Record<string, unknown>, actorId?: string) {
  if (body.action === 'issue' && body.quoteId && hasDatabaseUrl()) {
    const quote = await issueQuotationDb(String(body.quoteId));
    return { quote };
  }

  if (body.action === 'create_db' && hasDatabaseUrl()) {
    const quote = await createQuotationDb({
      customerName: String(body.clientName || body.customerName || 'B2B Client'),
      customerPhone: body.clientPhone as string | undefined,
      customerId: body.customerId as string | undefined,
      lines: ((body.lines || []) as Array<{ productId?: string; variantId?: string; name: string; qty?: number; price?: number; unitPrice?: number }>).map(
        (l) => ({
          productId: l.productId,
          variantId: l.variantId,
          name: l.name,
          qty: Number(l.qty || 1),
          unitPrice: Number(l.unitPrice ?? l.price ?? 0),
        }),
      ),
      createdBy: actorId,
    });
    return { quote };
  }

  const cleanQuoteNo = (body.quoteNo as string) || `QT-${Math.floor(1000 + Math.random() * 9000)}`;
  const items = Array.isArray(body.lines) ? body.lines : [];
  const subtotal = items.reduce(
    (acc: number, it: { price?: number; qty?: number }) =>
      acc + Number(it.price || 0) * Number(it.qty || 1),
    0,
  );
  const tax = Number(body.taxAmount) || 0;
  const disc = Number(body.discountAmount) || 0;
  const grandTotal = Math.max(0, subtotal + tax - disc);

  const payload = {
    id: `quote_${cleanQuoteNo}`,
    quoteNo: cleanQuoteNo,
    clientName: String(body.clientName || '').trim(),
    clientPhone: body.clientPhone ? String(body.clientPhone).trim() : '',
    clientEmail: body.clientEmail ? String(body.clientEmail).trim() : '',
    validUntil: body.validUntil || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    lines: items,
    subtotal,
    taxAmount: tax,
    discountAmount: disc,
    grandTotal,
    notes: body.notes || '',
    status: 'ISSUED' as const,
    createdAt: new Date().toISOString(),
  };

  await upsertCollectionItem('quotations', payload);
  return { quote: payload };
}

export async function handleQuotationPatch(
  body: Record<string, unknown>,
  actorId: string | null,
) {
  if (!body.id) {
    throw Object.assign(new Error('id required'), { status: 400 });
  }

  if (hasDatabaseUrl() && !String(body.id).startsWith('quote_')) {
    const [existingDb] = await db.select().from(quotations).where(eq(quotations.id, String(body.id))).limit(1);
    if (existingDb) {
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
    }
  }

  const quotes = await listCollection<{ id: string } & Record<string, unknown>>('quotations');
  const existing = quotes.find((q) => q.id === body.id);
  if (!existing) {
    throw Object.assign(new Error('Quote not found'), { status: 404 });
  }

  if (body.action === 'issue' && body.id && hasDatabaseUrl()) {
    const quote = await issueQuotationDb(String(body.id));
    return { quote };
  }

  if (body.action === 'convert_to_order') {
    if (existing.status === 'CONVERTED') {
      throw Object.assign(new Error('Quote already converted'), { status: 409 });
    }
    const order = await convertQuoteToOrder(existing as Parameters<typeof convertQuoteToOrder>[0], actorId);
    const payload = {
      ...existing,
      status: 'CONVERTED',
      convertedOrderId: order.id,
      convertedOrderNumber: order.orderNumber,
      convertedAt: new Date().toISOString(),
    };
    await upsertCollectionItem('quotations', payload);
    return { quote: payload, order };
  }

  if (body.action === 'update_status') {
    const status = String(body.status || '').toUpperCase();
    if (!QUOTE_STATUSES.includes(status as (typeof QUOTE_STATUSES)[number])) {
      throw Object.assign(new Error('Invalid status'), { status: 400 });
    }
    if (existing.status === 'CONVERTED') {
      throw Object.assign(new Error('Converted quotes are locked'), { status: 409 });
    }
    const payload = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };
    await upsertCollectionItem('quotations', payload);
    return { quote: payload };
  }

  const payload = {
    ...existing,
    ...body,
    id: String(body.id),
    updatedAt: new Date().toISOString(),
  };
  await upsertCollectionItem('quotations', payload);
  return { quote: payload };
}

export async function deleteQuotationById(id: string) {
  await deleteCollectionItem('quotations', id);
}
