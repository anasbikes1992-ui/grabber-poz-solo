import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, requireStaffSession } from '@/lib/auth/session';
import { db, categories, products } from '@/db';
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

export async function PATCH(req: Request) {
  try {
    const session = await requireStaffSession();
    assertCanMutateCommerce(session);

    const body = await req.json();
    const id = String(body.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    const updates: Partial<typeof categories.$inferInsert> = {};
    if (body.name !== undefined) {
      const trimmed = String(body.name).trim();
      if (!trimmed) {
        return NextResponse.json({ success: false, error: 'Category name cannot be empty' }, { status: 400 });
      }
      updates.name = trimmed;
      if (!body.slug) {
        updates.slug = slugify(trimmed);
      }
    }
    if (body.slug !== undefined) {
      updates.slug = slugify(String(body.slug).trim());
    }
    if (body.imageUrl !== undefined) {
      updates.imageUrl = (body.imageUrl as string) || null;
    }
    if (body.active !== undefined) {
      updates.active = Boolean(body.active);
    }

    const [updated] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();

    return NextResponse.json({ success: true, category: updated, message: 'Category updated successfully' });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json(
      { success: false, error: e.message || 'Failed to update category' },
      { status: e.status || 400 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireStaffSession();
    assertCanMutateCommerce(session);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const reassignToId = searchParams.get('reassignToId');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    // If reassignToId provided, update products belonging to this category
    if (reassignToId) {
      await db
        .update(products)
        .set({ categoryId: reassignToId })
        .where(eq(products.categoryId, id));
    } else {
      await db
        .update(products)
        .set({ categoryId: null })
        .where(eq(products.categoryId, id));
    }

    // Delete category
    await db.delete(categories).where(eq(categories.id, id));

    return NextResponse.json({
      success: true,
      message: `Category "${existing.name}" deleted successfully`,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json(
      { success: false, error: e.message || 'Failed to delete category' },
      { status: e.status || 400 },
    );
  }
}
