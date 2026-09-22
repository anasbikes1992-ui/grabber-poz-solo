/**
 * Sri Lanka tax e-invoice readiness pack.
 * Builds IRD-oriented JSON payloads from orders; submission is queued locally
 * until a certified gateway provider is configured (EINVOICE_PROVIDER_URL).
 */
import { desc, eq } from 'drizzle-orm';
import { db, einvoiceSubmissions, orderItems, orders, products, customers } from '@/db';
import { readBusinessProfile } from '@/lib/config/business-settings';

function actorId(userId?: string | null): string | null {
  if (!userId || userId === '00000000-0000-0000-0000-000000000001') return null;
  return userId;
}

export async function buildTaxInvoicePayload(orderNumber: string) {
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) throw new Error('Order not found');

  const profile = await readBusinessProfile().catch(() => null);
  let buyerName = 'Customer';
  let buyerPhone: string | null = null;
  if (order.customerId) {
    const [c] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
    buyerName = c?.name || buyerName;
    buyerPhone = c?.phone || null;
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const lines = [];
  for (const item of items) {
    const [p] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    lines.push({
      description: p?.name || 'Item',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      taxAmount: Number(item.taxAmount),
      lineTotal: Number(item.lineTotal),
      sku: p?.sku || null,
    });
  }

  return {
    schemaVersion: 'grabber-einvoice-1.0',
    documentType: 'TAX_INVOICE',
    currency: 'LKR',
    issuedAt: order.createdAt?.toISOString?.() || new Date().toISOString(),
    seller: {
      name: profile?.name || process.env.STORE_NAME || 'Merchant',
      taxRegistrationNumber: (profile as { taxNumber?: string } | null)?.taxNumber || null,
      address: (profile as { address?: string } | null)?.address || null,
    },
    buyer: { name: buyerName, phone: buyerPhone },
    invoice: {
      orderNumber: order.orderNumber,
      orderId: order.id,
      subtotal: Number(order.subtotal),
      taxTotal: Number(order.taxTotal),
      grandTotal: Number(order.grandTotal),
      paymentStatus: order.paymentStatus,
      channel: order.channel,
    },
    lines,
    vatRateHint: 0.18,
    complianceNote:
      'Payload prepared for IRD e-invoice / VAT reporting. Not certified until EINVOICE_PROVIDER_URL accepts submission.',
  };
}

export async function createEinvoiceDraft(orderNumber: string, createdBy?: string | null) {
  const payload = await buildTaxInvoicePayload(orderNumber);
  const [row] = await db
    .insert(einvoiceSubmissions)
    .values({
      orderId: String(payload.invoice.orderId),
      orderNumber,
      documentType: 'TAX_INVOICE',
      status: 'DRAFT',
      payloadJson: payload,
      createdBy: actorId(createdBy),
    })
    .returning();
  return row;
}

export async function queueEinvoiceSubmission(id: string) {
  const [row] = await db.select().from(einvoiceSubmissions).where(eq(einvoiceSubmissions.id, id)).limit(1);
  if (!row) throw new Error('E-invoice submission not found');
  if (row.status === 'ACCEPTED') return row;

  const [updated] = await db
    .update(einvoiceSubmissions)
    .set({ status: 'QUEUED', updatedAt: new Date(), errorMessage: null })
    .where(eq(einvoiceSubmissions.id, id))
    .returning();
  return updated;
}

export async function submitEinvoice(id: string) {
  const [row] = await db.select().from(einvoiceSubmissions).where(eq(einvoiceSubmissions.id, id)).limit(1);
  if (!row) throw new Error('E-invoice submission not found');

  const providerUrl = process.env.EINVOICE_PROVIDER_URL;
  if (!providerUrl) {
    const [updated] = await db
      .update(einvoiceSubmissions)
      .set({
        status: 'SUBMITTED',
        providerRef: `LOCAL-${Date.now().toString(36)}`,
        submittedAt: new Date(),
        updatedAt: new Date(),
        errorMessage: 'No EINVOICE_PROVIDER_URL — marked SUBMITTED locally for ops export',
      })
      .where(eq(einvoiceSubmissions.id, id))
      .returning();
    return updated;
  }

  try {
    const res = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.EINVOICE_PROVIDER_KEY
          ? { Authorization: `Bearer ${process.env.EINVOICE_PROVIDER_KEY}` }
          : {}),
      },
      body: JSON.stringify(row.payloadJson),
    });
    const data = (await res.json().catch(() => ({}))) as { ref?: string; id?: string; message?: string };
    if (!res.ok) {
      const [updated] = await db
        .update(einvoiceSubmissions)
        .set({
          status: 'REJECTED',
          errorMessage: data.message || `HTTP ${res.status}`,
          updatedAt: new Date(),
        })
        .where(eq(einvoiceSubmissions.id, id))
        .returning();
      return updated;
    }
    const [updated] = await db
      .update(einvoiceSubmissions)
      .set({
        status: 'ACCEPTED',
        providerRef: data.ref || data.id || null,
        submittedAt: new Date(),
        updatedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(einvoiceSubmissions.id, id))
      .returning();
    return updated;
  } catch (err) {
    const [updated] = await db
      .update(einvoiceSubmissions)
      .set({
        status: 'REJECTED',
        errorMessage: (err as Error).message,
        updatedAt: new Date(),
      })
      .where(eq(einvoiceSubmissions.id, id))
      .returning();
    return updated;
  }
}

export async function listEinvoices(limit = 50) {
  return db.select().from(einvoiceSubmissions).orderBy(desc(einvoiceSubmissions.createdAt)).limit(limit);
}
