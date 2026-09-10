/**
 * VERT-R01 — Recipe / food-cost rollup from ingredient costPrice.
 */
import { eq } from 'drizzle-orm';
import { products, recipeLines, recipes } from '@/db/schema';

export type RecipeCostBreakdown = {
  recipeId: string;
  recipeName: string;
  dishProductId: string;
  dishName: string;
  salePrice: number;
  recipeCost: number;
  foodCostPct: number;
  ingredients: Array<{
    ingredientProductId: string;
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    lineCost: number;
  }>;
};

export async function computeRecipeCost(
  db: { select: typeof import('@/db').db.select },
  recipeId: string,
): Promise<RecipeCostBreakdown | null> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1);
  if (!recipe) return null;

  const [dish] = await db.select().from(products).where(eq(products.id, recipe.productId)).limit(1);
  const lines = await db.select().from(recipeLines).where(eq(recipeLines.recipeId, recipe.id));

  const ingredients = [];
  let recipeCost = 0;
  for (const line of lines) {
    const [ing] = await db.select().from(products).where(eq(products.id, line.ingredientProductId)).limit(1);
    const qty = Number(line.quantity || 0);
    const unitCost = Number(ing?.costPrice || 0);
    const lineCost = Math.round(qty * unitCost * 100) / 100;
    recipeCost += lineCost;
    ingredients.push({
      ingredientProductId: line.ingredientProductId,
      name: ing?.name || 'Ingredient',
      quantity: qty,
      unit: line.unit || 'ea',
      unitCost,
      lineCost,
    });
  }

  const salePrice = Number(dish?.salePrice || 0);
  const foodCostPct = salePrice > 0 ? Math.round((recipeCost / salePrice) * 1000) / 10 : 0;

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    dishProductId: recipe.productId,
    dishName: dish?.name || recipe.name,
    salePrice,
    recipeCost: Math.round(recipeCost * 100) / 100,
    foodCostPct,
    ingredients,
  };
}

export async function listRecipesWithCost(db: { select: typeof import('@/db').db.select }) {
  const rows = await db.select().from(recipes).where(eq(recipes.active, true));
  const out: RecipeCostBreakdown[] = [];
  for (const r of rows) {
    const cost = await computeRecipeCost(db, r.id);
    if (cost) out.push(cost);
  }
  return out;
}
