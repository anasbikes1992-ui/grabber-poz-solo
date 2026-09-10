/**
 * VERT-S01 — Map salon appointment service text → SERVICE product.
 */
import { eq, ilike, or } from 'drizzle-orm';
import { db, products } from '@/db';

/** Canonical salon services seeded for VERT-P01. */
export const SALON_SERVICE_SKUS = [
  { sku: 'SALON-HAIRCUT', name: 'Haircut', durationMin: 30, sale: '1500.00', cost: '200.00' },
  { sku: 'SALON-SHAVE', name: 'Beard Shave', durationMin: 20, sale: '800.00', cost: '100.00' },
  { sku: 'SALON-COLOR', name: 'Hair Color', durationMin: 90, sale: '5500.00', cost: '1800.00' },
  { sku: 'SALON-BLOWDRY', name: 'Blow Dry', durationMin: 25, sale: '1200.00', cost: '150.00' },
] as const;

export const SALON_RETAIL_SKUS = [
  { sku: 'SALON-SHAMPOO', name: 'Salon Shampoo 250ml', sale: '1800.00', cost: '900.00', category: 'Retail' },
  { sku: 'SALON-POMADE', name: 'Barber Pomade', sale: '2200.00', cost: '1100.00', category: 'Retail' },
] as const;

export async function resolveServiceProductId(serviceName: string, explicitProductId?: string | null) {
  if (explicitProductId) {
    const [p] = await db.select({ id: products.id }).from(products).where(eq(products.id, explicitProductId)).limit(1);
    if (p) return p.id;
  }

  const name = String(serviceName || '').trim();
  if (!name) return null;

  const [exact] = await db
    .select({ id: products.id })
    .from(products)
    .where(or(ilike(products.name, name), ilike(products.sku, name)))
    .limit(1);
  if (exact) return exact.id;

  const lowered = name.toLowerCase();
  for (const s of SALON_SERVICE_SKUS) {
    if (lowered.includes(s.name.toLowerCase()) || lowered.includes(s.sku.toLowerCase())) {
      const [row] = await db.select({ id: products.id }).from(products).where(eq(products.sku, s.sku)).limit(1);
      if (row) return row.id;
    }
  }

  return null;
}
