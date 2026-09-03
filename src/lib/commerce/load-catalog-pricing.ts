import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { products, productVariants, taxProfiles, taxRates } from '@/db/schema';
import type { TaxRate } from '@/lib/commerce/tax-engine';
import {
  resolveCatalogLine,
  type CatalogIntentLine,
  type ResolvedCatalogLine,
} from '@/lib/commerce/authoritative-pricing';

type Queryable = Pick<typeof db, 'select'>;

export async function loadTaxRegistry(tx: Queryable): Promise<{
  rates: TaxRate[];
  defaultTaxProfileId: string | null;
}> {
  const [standard] = await tx
    .select({ id: taxProfiles.id })
    .from(taxProfiles)
    .where(eq(taxProfiles.code, 'STANDARD_VAT'))
    .limit(1);

  const rows = await tx.select().from(taxRates);
  const rates: TaxRate[] = rows.map((r) => ({
    id: r.id,
    taxProfileId: r.taxProfileId,
    name: r.name,
    ratePercentage: Number(r.ratePercentage),
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
  }));

  return { rates, defaultTaxProfileId: standard?.id ?? null };
}

export async function loadAuthoritativeLines(
  tx: Queryable,
  items: CatalogIntentLine[],
): Promise<ResolvedCatalogLine[]> {
  const lines: ResolvedCatalogLine[] = [];
  for (const item of items) {
    if (!item.productId) {
      throw Object.assign(new Error('productId is required on every line'), { status: 400 });
    }
    const [prod] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!prod) {
      throw Object.assign(new Error(`Product not found or inactive: ${item.productId}`), { status: 400 });
    }

    let variant = null;
    if (item.variantId) {
      const [row] = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, item.variantId))
        .limit(1);
      if (!row) {
        throw Object.assign(new Error(`Variant not found or inactive: ${item.variantId}`), { status: 400 });
      }
      variant = row;
    }

    lines.push(resolveCatalogLine(prod, variant, item.quantity));
  }
  return lines;
}
