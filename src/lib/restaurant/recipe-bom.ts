import { db, branches, recipeLines, recipes } from '@/db';
import { eq } from 'drizzle-orm';
import { recordAdjustment } from '@/lib/inventory/stock-service';

/** Deduct recipe ingredients when KOT items are served (BOM depletion). */
export async function depleteRecipeForProduct(
  tx: Parameters<typeof recordAdjustment>[0],
  productId: string,
  qtyMultiplier: number,
  referenceId: string,
) {
  const [branch] = await tx.select({ id: branches.id }).from(branches).limit(1);
  if (!branch) return;

  const [recipe] = await tx.select().from(recipes).where(eq(recipes.productId, productId)).limit(1);
  if (!recipe) return;

  const lines = await tx.select().from(recipeLines).where(eq(recipeLines.recipeId, recipe.id));
  for (const line of lines) {
    const qty = -Math.ceil(Number(line.quantity) * qtyMultiplier);
    if (qty === 0) continue;
    await recordAdjustment(
      tx,
      { locationType: 'BRANCH', locationId: branch.id },
      { productId: line.ingredientProductId, quantity: qty },
      { referenceType: 'KOT_BOM', referenceId, notes: `Recipe ${recipe.name}` },
    );
  }
}
