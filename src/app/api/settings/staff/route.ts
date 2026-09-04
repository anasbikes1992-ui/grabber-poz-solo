import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users, userAssignments, branches, warehouses, auditLogs } from '@/db';
import { assertCanMutateCommerce, getSession, hashPin } from '@/lib/auth/session';

async function requireManagerOrOwner() {
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
    if (session?.role !== 'OWNER' && session?.role !== 'ADMIN' && session?.role !== 'MANAGER') {
      throw Object.assign(new Error('Only Owners and Managers can manage staff accounts'), { status: 403 });
    }
  }
  return session!;
}

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userRows = await db.select().from(users).limit(100);
    const assignments = await db
      .select({
        userId: userAssignments.userId,
        branchId: userAssignments.branchId,
        warehouseId: userAssignments.warehouseId,
        branchName: branches.name,
        warehouseName: warehouses.name,
      })
      .from(userAssignments)
      .leftJoin(branches, eq(userAssignments.branchId, branches.id))
      .leftJoin(warehouses, eq(userAssignments.warehouseId, warehouses.id));

    const assignmentMap = new Map(assignments.map((a) => [a.userId, a]));

    return NextResponse.json({
      success: true,
      staff: userRows.map((u) => {
        const assign = assignmentMap.get(u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          branchId: assign?.branchId || null,
          branchName: assign?.branchName || null,
          warehouseId: assign?.warehouseId || null,
          warehouseName: assign?.warehouseName || null,
          createdAt: u.createdAt,
        };
      }),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message, staff: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireManagerOrOwner();
    const body = await req.json();

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const role = (body.role || 'CASHIER') as 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAREHOUSE' | 'ACCOUNTANT' | 'MARKETING';
    const pin = body.pin ? String(body.pin).trim() : '1234';
    const branchId = body.branchId || null;
    const warehouseId = body.warehouseId || null;

    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Name and email are required' }, { status: 400 });
    }

    // Role validation
    const validRoles = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE', 'ACCOUNTANT', 'MARKETING'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: `Invalid role '${role}'` }, { status: 400 });
    }

    // Prevent non-owners from creating Owners/Admins
    if ((role === 'OWNER' || role === 'ADMIN') && session.role !== 'OWNER' && session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Only Owners can create Owner or Admin accounts' }, { status: 403 });
    }

    // Email uniqueness
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return NextResponse.json({ success: false, error: `User with email '${email}' already exists` }, { status: 409 });
    }

    const hashedPin = hashPin(pin);

    const [createdUser] = await db
      .insert(users)
      .values({
        name,
        email,
        role: role as any,
        hashedPin,
        active: body.active !== false,
      })
      .returning();

    // Assign location if specified
    if (branchId || warehouseId) {
      await db.insert(userAssignments).values({
        userId: createdUser.id,
        branchId,
        warehouseId,
      });
    }

    await db.insert(auditLogs).values({
      actorId: session.userId,
      actorRole: session.role,
      action: 'STAFF_USER_CREATED',
      entity: 'USER',
      entityId: createdUser.id,
      afterState: { name, email, role, branchId, warehouseId, active: createdUser.active },
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        branchId,
        warehouseId,
        active: createdUser.active,
      },
    }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Staff creation failed' }, { status: e.status || 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireManagerOrOwner();
    const body = await req.json();

    const id = body.id;
    if (!id) {
      return NextResponse.json({ success: false, error: 'User id is required' }, { status: 400 });
    }

    const updates: Partial<{ name: string; role: any; active: boolean; hashedPin: string; updatedAt: Date }> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.role !== undefined) {
      const validRoles = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE', 'ACCOUNTANT', 'MARKETING'];
      if (!validRoles.includes(body.role)) {
        return NextResponse.json({ success: false, error: `Invalid role '${body.role}'` }, { status: 400 });
      }
      updates.role = body.role;
    }
    if (body.active !== undefined) updates.active = Boolean(body.active);
    if (body.pin) updates.hashedPin = hashPin(String(body.pin).trim());

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Update location assignments if requested
    if (body.branchId !== undefined || body.warehouseId !== undefined) {
      await db.delete(userAssignments).where(eq(userAssignments.userId, id));
      if (body.branchId || body.warehouseId) {
        await db.insert(userAssignments).values({
          userId: id,
          branchId: body.branchId || null,
          warehouseId: body.warehouseId || null,
        });
      }
    }

    await db.insert(auditLogs).values({
      actorId: session.userId,
      actorRole: session.role,
      action: 'STAFF_USER_UPDATED',
      entity: 'USER',
      entityId: updatedUser.id,
      afterState: updates,
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        active: updatedUser.active,
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Staff update failed' }, { status: e.status || 500 });
  }
}
