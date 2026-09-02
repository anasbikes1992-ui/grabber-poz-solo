import { eq } from 'drizzle-orm';
import { db, customers, deliveries, orders } from '@/db';
import { fetchWithRetry } from '@/lib/http/retry-fetch';

type DispatchInput = {
  orderId: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  codAmount?: number;
};

export async function dispatchOrderViaKoombiyo(input: DispatchInput) {
  const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
  if (!order) throw new Error('Order not found');

  const apiKey = process.env.KOOMBIYO_API_KEY;
  const baseUrl = process.env.KOOMBIYO_API_URL || 'https://api.koombiyo.com';
  let trackingNumber = `KMB-${Date.now().toString().slice(-8)}`;
  let stub = true;

  if (apiKey) {
    const res = await fetchWithRetry(`${baseUrl.replace(/\/$/, '')}/shipments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: order.orderNumber,
        recipient: {
          name: input.recipientName,
          phone: input.recipientPhone,
          address: input.address,
        },
      }),
    });
    const rawBody = await res.text();
    let data: { trackingNumber?: string; id?: string; message?: string; error?: string } = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      data = { message: rawBody.slice(0, 200) };
    }
    if (!res.ok) {
      const detail = data.message || data.error || rawBody.slice(0, 200) || 'unknown error';
      throw new Error(`Koombiyo API error (${res.status}): ${detail}`);
    }
    trackingNumber = data.trackingNumber || data.id || trackingNumber;
    stub = false;
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('KOOMBIYO_API_KEY required in production');
  }

  const [existing] = await db.select().from(deliveries).where(eq(deliveries.orderId, input.orderId)).limit(1);

  const payload = {
    orderId: input.orderId,
    courierPartner: 'Koombiyo',
    trackingNumber,
    status: 'IN_TRANSIT' as const,
    recipientName: input.recipientName,
    recipientPhone: input.recipientPhone,
    deliveryAddress: input.address,
    codAmount: input.codAmount != null ? String(input.codAmount) : null,
    dispatchedAt: new Date(),
  };

  if (existing) {
    const [row] = await db.update(deliveries).set(payload).where(eq(deliveries.id, existing.id)).returning();
    return { delivery: row, trackingNumber, stub };
  }

  const [row] = await db.insert(deliveries).values(payload).returning();
  return { delivery: row, trackingNumber, stub };
}

export async function getDeliveryForOrder(orderId: string) {
  const [row] = await db.select().from(deliveries).where(eq(deliveries.orderId, orderId)).limit(1);
  return row ?? null;
}

export async function loadCustomerForOrder(customerId: string | null) {
  if (!customerId) return null;
  const [c] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  return c ?? null;
}
