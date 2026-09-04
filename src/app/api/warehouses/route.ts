import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, warehouses, branches, stockBalances, auditLogs } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';

async function requireStaff() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = {
      userId: '00000000-0000-0000-0000-000000000001',
      email: 'dev@localhost',
      name: 'Dev',
      role: 'OWNER',
    };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // List warehouses joined with branch details
    const rows = await db
      .select({
        id: warehouses.id,
        name: warehouses.name,
        code: warehouses.code,
        address: warehouses.address,
        active: warehouses.active,
        branchId: warehouses.branchId,
        branchName: branches.name,
        createdAt: warehouses.createdAt,
      })
      .from(warehouses)
      .leftJoin(branches, eq(warehouses.branchId, branches.id))
      .orderBy(warehouses.createdAt);

    // Fetch stock summaries per warehouse
    const stockSummaries = await db
      .select({
        locationId: stockBalances.locationId,
        totalOnHand: sql<number>`COALESCE(SUM(${stockBalances.onHand}), 0)`,
        totalReserved: sql<number>`COALESCE(SUM(${stockBalances.reserved}), 0)`,
        uniqueSkus: sql<number>`COUNT(DISTINCT ${stockBalances.productId})`,
      })
      .from(stockBalances)
      .where(eq(stockBalances.locationType, 'WAREHOUSE'))
      .groupBy(stockBalances.locationId);

    const stockMap = new Map(stockSummaries.map((s) => [s.locationId, s]));

    const result = rows.map((w) => {
      const summary = stockMap.get(w.id);
      return {
        ...w,
        totalOnHand: Number(summary?.totalOnHand || 0),
        totalReserved: Number(summary?.totalReserved || 0),
        uniqueSkus: Number(summary?.uniqueSkus || 0),
      };
    });

    return NextResponse.json({ success: true, warehouses: result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireStaff();
    const body = await req.json();

    const name = String(body.name || '').trim();
    const code = String(body.code || '').trim().toUpperCase();
    const address = body.address ? String(body.address).trim() : null;
    const branchId = body.branchId || null;

    if (!name || !code) {
      return NextResponse.json({ success: false, error: 'Warehouse name and code are required' }, { status: 400 });
    }

    // Check code uniqueness
    const [existing] = await db.select().from(warehouses).where(eq(warehouses.code, code)).limit(1);
    if (existing) {
      return NextResponse.json({ success: false, error: `Warehouse code '${code}' already exists` }, { status: 409 });
    }

    const [created] = await db
      .insert(warehouses)
      .values({
        name,
        code,
        address,
        branchId,
        active: body.active !== false,
      })
      .returning();

    await db.insert(auditLogs).values({
      actorId: session.userId,
      actorRole: session.role,
      action: 'WAREHOUSE_CREATED',
      entity: 'WAREHOUSE',
      entityId: created.id,
      afterState: { name, code, branchId, active: created.active },
    });

    return NextResponse.json({ success: true, warehouse: created }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireStaff();
    const body = await req.json();

    const id = body.id;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Warehouse id is required' }, { status: 400 });
    }

    const updates: Partial<{ name: string; code: string; address: string | null; branchId: string | null; active: boolean }> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.code !== undefined) updates.code = String(body.code).trim().toUpperCase();
    if (body.address !== undefined) updates.address = body.address ? String(body.address).trim() : null;
    if (body.branchId !== undefined) updates.branchId = body.branchId || null;
    if (body.active !== undefined) updates.active = Boolean(body.active);

    const [updated] = await db
      .update(warehouses)
      .set(updates)
      .where(eq(warehouses.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
    }

    await db.insert(auditLogs).values({
      actorId: session.userId,
      actorRole: session.role,
      action: 'WAREHOUSE_UPDATED',
      entity: 'WAREHOUSE',
      entityId: updated.id,
      afterState: updates,
    });

    return NextResponse.json({ success: true, warehouse: updated });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
