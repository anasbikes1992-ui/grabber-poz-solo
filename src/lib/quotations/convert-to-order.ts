import { eq, ilike } from 'drizzle-orm';
import { db, customers, orderItems, orders, products, quotations } from '@/db';
import { releaseStock } from '@/lib/inventory/stock-reservation';
import type { QuoteLine } from '@/lib/quotations/quote-service';

type QuoteRecord = {
  id: string;
  quoteNo?: string;
  quoteNumber?: string;
  clientName?: string;
  customerName?: string;
  clientPhone?: string;
  customerPhone?: string;
  customerId?: string | null;
  lines?: QuoteLine[];
  linesJson?: QuoteLine[];
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal?: number;
  status?: string;
};

/** Valid LK-style mobile placeholder when quote has no client phone (unique per convert). */
function quoteFallbackPhone(quoteNo: string): string {
  const suffix = Date.now().toString().slice(-7);
  const clean = String(quoteNo).replace(/\D/g, '').slice(-3);
  return `9470${clean}${suffix}`.slice(0, 11);
}

function normalizeClientPhone(raw?: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length >= 9 && digits.length <= 15) return digits;
  return null;
}

function quoteLines(quote: QuoteRecord): QuoteLine[] {
  if (Array.isArray(quote.linesJson)) return quote.linesJson;
  if (Array.isArray(quote.lines)) return quote.lines;
  return [];
}

async function resolveProduct(line: QuoteLine) {
  if (line.productId) {
    const [byId] = await db.select().from(products).where(eq(products.id, line.productId)).limit(1);
    if (byId) return byId;
  }
  const name = String(line.name || '').trim();
  if (name) {
    const [matched] = await db.select().from(products).where(ilike(products.name, `%${name}%`)).limit(1);
    if (matched) return matched;
  }
  const [fallback] = await db.select().from(products).limit(1);
  if (!fallback) throw new Error('No products in catalog — run seed before converting quotes');
  return fallback;
}

export async function convertQuoteToOrder(quote: QuoteRecord, actorId?: string | null) {
  const lines = quoteLines(quote);
  const quoteNo = quote.quoteNumber || quote.quoteNo || quote.id;
  const grandTotal = Number(quote.grandTotal || 0);
  const clientName = (quote.customerName || quote.clientName || '').trim();
  const clientPhone = quote.customerPhone || quote.clientPhone;

  let customerId: string | null = quote.customerId || null;
  if (!customerId && clientName) {
    const [existing] = await db
      .select()
      .from(customers)
      .where(ilike(customers.name, clientName))
      .limit(1);
    if (existing) {
      customerId = existing.id;
    } else {
      const phone = normalizeClientPhone(clientPhone) || quoteFallbackPhone(String(quoteNo));
      const [created] = await db
        .insert(customers)
        .values({
          name: clientName,
          phone,
          email: null,
        })
        .returning();
      customerId = created.id;
    }
  }

  const orderNumber = `SO-${String(quoteNo)}`.replace(/\s+/g, '-').slice(0, 48);
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      channel: 'MANUAL',
      customerId,
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PENDING',
      fulfillmentStatus: 'PENDING',
      subtotal: String(quote.subtotal ?? grandTotal),
      taxTotal: String(quote.taxAmount ?? 0),
      discountTotal: String(quote.discountAmount ?? 0),
      grandTotal: String(grandTotal),
      createdBy: actorId || null,
    })
    .returning();

  const itemLines = lines.length ? lines : [{ name: 'Quoted items', qty: 1, unitPrice: grandTotal }];
  for (const line of itemLines) {
    const product = await resolveProduct(line);
    const qty = Number(line.qty || 1);
    const price = Number(line.unitPrice ?? (line as { price?: number }).price ?? 0);
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: product.id,
      variantId: line.variantId || null,
      quantity: qty,
      unitPrice: price.toFixed(2),
      lineTotal: (qty * price).toFixed(2),
    });
  }

  for (const line of lines) {
    if (!line.productId) continue;
    await releaseStock({
      productId: line.productId,
      variantId: line.variantId,
      qty: line.qty,
      referenceType: 'QUOTATION',
      referenceId: quote.id,
    }).catch(() => undefined);
  }

  if (quote.id && !quote.id.startsWith('quote_')) {
    await db
      .update(quotations)
      .set({
        status: 'CONVERTED',
        convertedOrderId: order.id,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, quote.id));
  }

  return order;
}
