import { randomBytes } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { abandonedCarts } from '@/db/schema';
import { enqueueJob } from '@/lib/jobs/outbox';

export type CartLine = {
  productId: string;
  variantId?: string;
  name: string;
  unitPrice: number;
  qty: number;
};

const ABANDON_DELAY_MS = 30 * 60 * 1000;

export function buildRecoveryUrl(token: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/shop/checkout?recover=${encodeURIComponent(token)}`;
}

export function abandonedCartMessage(cart: CartLine[], recoveryUrl: string, promoCode?: string) {
  const itemSummary = cart
    .slice(0, 3)
    .map((l) => `${l.qty}x ${l.name}`)
    .join(', ');
  const promo = promoCode ? `\n\nUse code *${promoCode}* for 5% off when you complete checkout.` : '';
  return `👋 You left items in your cart: ${itemSummary}${cart.length > 3 ? '…' : ''}.\n\nComplete your order: ${recoveryUrl}${promo}`;
}

export async function recordAbandonedCheckout(
  db: {
    insert: typeof import('@/db').db.insert;
    select: typeof import('@/db').db.select;
    update: typeof import('@/db').db.update;
  },
  input: { phone: string; customerId?: string; cart: CartLine[]; promoCode?: string },
) {
  const phone = input.phone.replace(/\D/g, '');
  if (!phone || !input.cart.length) return { recorded: false };

  const recoveryToken = randomBytes(16).toString('hex');
  const recoveryUrl = buildRecoveryUrl(recoveryToken);

  const [existing] = await db
    .select()
    .from(abandonedCarts)
    .where(and(eq(abandonedCarts.phone, phone), eq(abandonedCarts.status, 'OPEN')))
    .limit(1);

  if (existing) {
    await db
      .update(abandonedCarts)
      .set({ cartJson: input.cart, abandonedAt: new Date(), promoCode: input.promoCode || null })
      .where(eq(abandonedCarts.id, existing.id));
  } else {
    await db.insert(abandonedCarts).values({
      phone,
      customerId: input.customerId || null,
      cartJson: input.cart,
      promoCode: input.promoCode || null,
      recoveryToken,
      status: 'OPEN',
    });
  }

  const idempotencyKey = `abandon:${phone}:${Date.now().toString().slice(0, -5)}`;
  await enqueueJob({
    type: 'CHECKOUT_ABANDON',
    idempotencyKey,
    payload: {
      phone,
      recoveryToken: existing?.recoveryToken || recoveryToken,
      recoveryUrl: buildRecoveryUrl(existing?.recoveryToken || recoveryToken),
      promoCode: input.promoCode,
      itemCount: input.cart.length,
    },
    scheduledAt: new Date(Date.now() + ABANDON_DELAY_MS),
  });

  return { recorded: true, recoveryUrl, recoveryToken: existing?.recoveryToken || recoveryToken };
}

export async function markCartRecovered(
  db: { update: typeof import('@/db').db.update; select: typeof import('@/db').db.select },
  recoveryToken: string,
  orderId: string,
) {
  const [row] = await db
    .select()
    .from(abandonedCarts)
    .where(eq(abandonedCarts.recoveryToken, recoveryToken))
    .limit(1);
  if (!row) return false;
  await db
    .update(abandonedCarts)
    .set({ status: 'RECOVERED', recoveredOrderId: orderId })
    .where(eq(abandonedCarts.id, row.id));
  return true;
}
