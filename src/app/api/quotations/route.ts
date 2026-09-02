import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { deleteCollectionItem, listCollection, upsertCollectionItem } from '@/lib/db/app-collections';
import { convertQuoteToOrder } from '@/lib/quotations/convert-to-order';
import { createQuotationDb, issueQuotationDb, listQuotationsDb } from '@/lib/quotations/quote-service';
import { db, hasDatabaseUrl, quotations } from '@/db';

const QUOTE_STATUSES = ['DRAFT', 'ISSUED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'] as const;

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const quotes = hasDatabaseUrl()
      ? (await listQuotationsDb()).map((q) => ({
          ...q,
          id: q.id,
          quoteNo: q.quoteNumber,
          clientName: q.customerName,
          lines: q.linesJson,
        }))
      : await listCollection<{ id: string } & Record<string, unknown>>('quotations');
    return NextResponse.json({ success: true, quotes });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();

    if (body.action === 'issue' && body.quoteId && hasDatabaseUrl()) {
      const quote = await issueQuotationDb(String(body.quoteId));
      return NextResponse.json({ success: true, quote });
    }

    if (body.action === 'create_db' && hasDatabaseUrl()) {
      const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;
      const quote = await createQuotationDb({
        customerName: String(body.clientName || body.customerName || 'B2B Client'),
        customerPhone: body.clientPhone,
        customerId: body.customerId,
        lines: (body.lines || []).map((l: { productId?: string; variantId?: string; name: string; qty?: number; price?: number; unitPrice?: number }) => ({
          productId: l.productId,
          variantId: l.variantId,
          name: l.name,
          qty: Number(l.qty || 1),
          unitPrice: Number(l.unitPrice ?? l.price ?? 0),
        })),
        createdBy: actorId,
      });
      return NextResponse.json({ success: true, quote });
    }

    const cleanQuoteNo = body.quoteNo || `QT-${Math.floor(1000 + Math.random() * 9000)}`;
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
    return NextResponse.json({ success: true, quote: payload });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    assertCanMutateCommerce(await getSession());
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    await deleteCollectionItem('quotations', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    if (hasDatabaseUrl() && !String(body.id).startsWith('quote_')) {
      const [existingDb] = await db.select().from(quotations).where(eq(quotations.id, String(body.id))).limit(1);
      if (existingDb) {
        if (body.action === 'issue') {
          const quote = await issueQuotationDb(String(body.id));
          return NextResponse.json({ success: true, quote });
        }
        if (body.action === 'convert_to_order') {
          if (existingDb.status === 'CONVERTED') {
            return NextResponse.json({ success: false, error: 'Quote already converted' }, { status: 409 });
          }
          const actorId = session && !isDemoUserId(session.userId) ? session.userId : null;
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
          return NextResponse.json({ success: true, quote, order });
        }
        if (body.action === 'update_status') {
          const status = String(body.status || '').toUpperCase();
          if (!QUOTE_STATUSES.includes(status as (typeof QUOTE_STATUSES)[number])) {
            return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
          }
          if (existingDb.status === 'CONVERTED') {
            return NextResponse.json({ success: false, error: 'Converted quotes are locked' }, { status: 409 });
          }
          const [quote] = await db
            .update(quotations)
            .set({ status, updatedAt: new Date() })
            .where(eq(quotations.id, existingDb.id))
            .returning();
          return NextResponse.json({ success: true, quote });
        }
      }
    }

    const quotes = await listCollection<{ id: string } & Record<string, unknown>>('quotations');
    const existing = quotes.find((q) => q.id === body.id);
    if (!existing) return NextResponse.json({ success: false, error: 'Quote not found' }, { status: 404 });

    if (body.action === 'issue' && body.id && hasDatabaseUrl()) {
      const quote = await issueQuotationDb(String(body.id));
      return NextResponse.json({ success: true, quote });
    }

    if (body.action === 'convert_to_order') {
      const actorId = session && !isDemoUserId(session.userId) ? session.userId : null;

      if (existing.status === 'CONVERTED') {
        return NextResponse.json({ success: false, error: 'Quote already converted' }, { status: 409 });
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
      return NextResponse.json({ success: true, quote: payload, order });
    }

    if (body.action === 'update_status') {
      const status = String(body.status || '').toUpperCase();
      if (!QUOTE_STATUSES.includes(status as (typeof QUOTE_STATUSES)[number])) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      if (existing.status === 'CONVERTED') {
        return NextResponse.json({ success: false, error: 'Converted quotes are locked' }, { status: 409 });
      }
      const payload = {
        ...existing,
        status,
        updatedAt: new Date().toISOString(),
      };
      await upsertCollectionItem('quotations', payload);
      return NextResponse.json({ success: true, quote: payload });
    }

    const payload = {
      ...existing,
      ...body,
      id: body.id,
      updatedAt: new Date().toISOString(),
    };
    await upsertCollectionItem('quotations', payload);
    return NextResponse.json({ success: true, quote: payload });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
