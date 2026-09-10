import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, requireStaffSession } from '@/lib/auth/session';
import { db, categories } from '@/db';
import { listCategoriesWithCounts } from '@/lib/catalog/product-service';
import { eq } from 'drizzle-orm';

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return base || 'category';
}

export async function GET() {
  try {
    const data = await listCategoriesWithCounts();
    return NextResponse.json({ success: true, ...data });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || 'Failed to fetch categories', categories: [] },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireStaffSession();
    assertCanMutateCommerce(session);

    const body = await req.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
    }

    const slug = body.slug ? String(body.slug).trim() : slugify(name);
    const [existing] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (existing) {
      return NextResponse.json({ success: true, category: existing, created: false });
    }

    const [created] = await db
      .insert(categories)
      .values({
        name,
        slug,
        imageUrl: (body.imageUrl as string) || null,
        active: true,
      })
      .returning();

    return NextResponse.json({ success: true, category: created, created: true }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json(
      { success: false, error: e.message || 'Failed to create category' },
      { status: e.status || 400 },
    );
  }
}
