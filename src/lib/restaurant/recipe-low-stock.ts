import { and, eq } from 'drizzle-orm';
import { products, recipeLines, recipes, stockBalances } from '@/db/schema';

export type LowStockIngredient = {
  productId: string;
  name: string;
  onHand: number;
  required: number;
  shortfall: number;
};

/** After BOM depletion, flag ingredients below reorder threshold (default 5). */
export async function checkRecipeLowStock(
  db: { select: typeof import('@/db').db.select },
  branchId: string,
  threshold = 5,
): Promise<LowStockIngredient[]> {
  const recipeRows = await db.select().from(recipes).where(eq(recipes.active, true));
  const alerts: LowStockIngredient[] = [];
  const seen = new Set<string>();

  for (const recipe of recipeRows) {
    const lines = await db.select().from(recipeLines).where(eq(recipeLines.recipeId, recipe.id));
    for (const line of lines) {
      if (seen.has(line.ingredientProductId)) continue;
      const [bal] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.locationType, 'BRANCH'),
            eq(stockBalances.locationId, branchId),
            eq(stockBalances.productId, line.ingredientProductId),
          ),
        )
        .limit(1);
      const onHand = bal?.onHand ?? 0;
      const required = Math.ceil(Number(line.quantity));
      if (onHand <= threshold) {
        seen.add(line.ingredientProductId);
        const [prod] = await db.select().from(products).where(eq(products.id, line.ingredientProductId)).limit(1);
        alerts.push({
          productId: line.ingredientProductId,
          name: prod?.name || 'Ingredient',
          onHand,
          required,
          shortfall: Math.max(0, required - onHand),
        });
      }
    }
  }

  return alerts.sort((a, b) => a.onHand - b.onHand);
}

export async function listRecipesWithIngredients(db: { select: typeof import('@/db').db.select }) {
  const recipeRows = await db.select().from(recipes).where(eq(recipes.active, true));
  const result = [];
  for (const r of recipeRows) {
    const lines = await db.select().from(recipeLines).where(eq(recipeLines.recipeId, r.id));
    const [dish] = await db.select().from(products).where(eq(products.id, r.productId)).limit(1);
    result.push({
      id: r.id,
      name: r.name,
      dishProductId: r.productId,
      dishName: dish?.name,
      ingredients: lines.map((l) => ({
        ingredientProductId: l.ingredientProductId,
        quantity: Number(l.quantity),
        unit: l.unit,
      })),
    });
  }
  return result;
}
