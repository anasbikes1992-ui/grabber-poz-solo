import { NextResponse } from 'next/server';
import { eq, or, inArray } from 'drizzle-orm';
import { db, productVariants, products, stockBalances } from '@/db';
import { assertCanMutateCommerce, requireStaffSession } from '@/lib/auth/session';

/**
 * Maintenance API: Cleans up dummy 'simple' / 'default' variant records
 * and ensures all stock balances and SKUs belong directly to base products.
 */
export async function POST() {
  try {
    assertCanMutateCommerce(await requireStaffSession());

    // 1. Find all dummy variants
    const dummyVars = await db
      .select()
      .from(productVariants)
      .where(
        or(
          eq(productVariants.name, 'simple'),
          eq(productVariants.name, 'variable'),
          eq(productVariants.name, 'default'),
          eq(productVariants.name, 'standard'),
        ),
      );

    if (!dummyVars.length) {
      return NextResponse.json({ success: true, message: 'No legacy dummy variants found', cleanedCount: 0 });
    }

    const dummyVariantIds = dummyVars.map((v) => v.id);

    // 2. Re-assign any stock balances attached to dummy variants to the base product
    for (const v of dummyVars) {
      const balances = await db
        .select()
        .from(stockBalances)
        .where(eq(stockBalances.variantId, v.id));

      for (const bal of balances) {
        // Transfer to base product balance
        const [existingBaseBal] = await db
          .select()
          .from(stockBalances)
          .where(eq(stockBalances.productId, v.productId))
          .limit(1);

        if (existingBaseBal) {
          await db
            .update(stockBalances)
            .set({ onHand: existingBaseBal.onHand + bal.onHand, variantId: null })
            .where(eq(stockBalances.id, existingBaseBal.id));
          await db.delete(stockBalances).where(eq(stockBalances.id, bal.id));
        } else {
          await db
            .update(stockBalances)
            .set({ variantId: null })
            .where(eq(stockBalances.id, bal.id));
        }
      }
    }

    // 3. Delete the dummy variants
    await db.delete(productVariants).where(inArray(productVariants.id, dummyVariantIds));

    // 4. Clean up any product SKUs that ended up with '-simple' suffix
    const allProds = await db.select().from(products);
    let cleanedSkuCount = 0;
    for (const p of allProds) {
      if (p.sku.endsWith('-simple')) {
        const cleanSku = p.sku.replace(/-simple$/, '');
        try {
          await db.update(products).set({ sku: cleanSku, updatedAt: new Date() }).where(eq(products.id, p.id));
          cleanedSkuCount++;
        } catch {
          // If clean SKU already exists, keep unique
        }
      }
    }

    return NextResponse.json({
      success: true,
      cleanedVariants: dummyVars.length,
      cleanedProductSkus: cleanedSkuCount,
      message: `Cleaned ${dummyVars.length} dummy variants and updated ${cleanedSkuCount} product SKUs.`,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Cleanup failed' }, { status: e.status || 500 });
  }
}
