import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, branches, recipeLines, recipes } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { checkRecipeLowStock, listRecipesWithIngredients } from '@/lib/restaurant/recipe-low-stock';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET(req: Request) {
  try {
    const lowStock = new URL(req.url).searchParams.get('lowStock') === '1';
    const list = await listRecipesWithIngredients(db);
    let alerts: Awaited<ReturnType<typeof checkRecipeLowStock>> = [];
    if (lowStock) {
      const [branch] = await db.select().from(branches).limit(1);
      if (branch) alerts = await checkRecipeLowStock(db, branch.id);
    }
    return NextResponse.json({ success: true, recipes: list, lowStockAlerts: alerts });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const { productId, name, ingredients } = body as {
      productId: string;
      name: string;
      ingredients: Array<{ ingredientProductId: string; quantity: number; unit?: string }>;
    };

    if (!productId || !name || !ingredients?.length) {
      return NextResponse.json({ success: false, error: 'productId, name, ingredients required' }, { status: 400 });
    }

    const [recipe] = await db
      .insert(recipes)
      .values({ productId, name, active: true })
      .returning();

    for (const ing of ingredients) {
      await db.insert(recipeLines).values({
        recipeId: recipe.id,
        ingredientProductId: ing.ingredientProductId,
        quantity: String(ing.quantity),
        unit: ing.unit || 'ea',
      });
    }

    return NextResponse.json({ success: true, recipe });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await actor();
    const body = await req.json();
    if (!body.recipeId) return NextResponse.json({ success: false, error: 'recipeId required' }, { status: 400 });
    await db.update(recipes).set({ active: body.active ?? true, name: body.name }).where(eq(recipes.id, body.recipeId));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
