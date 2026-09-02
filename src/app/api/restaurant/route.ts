import { NextResponse } from 'next/server';
import { depleteRecipeForProduct } from '@/lib/restaurant/recipe-bom';
import { checkRecipeLowStock } from '@/lib/restaurant/recipe-low-stock';
import { asc, desc, eq } from 'drizzle-orm';
import { db, diningTables, kitchenTickets, branches } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET() {
  try {
    const tables = await db.select().from(diningTables).where(eq(diningTables.active, true)).orderBy(asc(diningTables.sortOrder));
    const tickets = await db
      .select()
      .from(kitchenTickets)
      .where(eq(kitchenTickets.status, 'OPEN'))
      .orderBy(desc(kitchenTickets.createdAt))
      .limit(50);
    const openByTable = new Map(tickets.filter((t) => t.tableId).map((t) => [t.tableId!, t]));
    return NextResponse.json({
      success: true,
      tables: tables.map((t) => ({
        ...t,
        activeOrder: openByTable.get(t.id)
          ? {
              kotNumber: openByTable.get(t.id)!.kotNumber,
              items: openByTable.get(t.id)!.itemsJson,
              total: Number(openByTable.get(t.id)!.totalAmount),
              waiter: openByTable.get(t.id)!.waiterName || '',
              ticketId: openByTable.get(t.id)!.id,
            }
          : undefined,
      })),
      tickets,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

/** Seed floor tables or update table status / create KOT */
export async function POST(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const action = body.action || 'create_table';

    if (action === 'seed_floor') {
      const existing = await db.select().from(diningTables).limit(1);
      if (existing.length) {
        return NextResponse.json({ success: true, reused: true });
      }
      const [branch] = await db.select().from(branches).limit(1);
      const seed = [
        { name: 'Table 01 (Window)', capacity: 4, sortOrder: 1 },
        { name: 'Table 02 (Center)', capacity: 2, sortOrder: 2 },
        { name: 'Table 03 (Booth)', capacity: 6, sortOrder: 3 },
        { name: 'Table 04 (Booth)', capacity: 6, sortOrder: 4 },
        { name: 'VIP Lounge Dining', capacity: 10, sortOrder: 5 },
        { name: 'Takeaway Counter #1', capacity: 1, sortOrder: 6 },
      ];
      const rows = await db
        .insert(diningTables)
        .values(seed.map((s) => ({ ...s, branchId: branch?.id || null, status: 'VACANT' })))
        .returning();
      return NextResponse.json({ success: true, tables: rows });
    }

    if (action === 'set_status') {
      const [table] = await db
        .update(diningTables)
        .set({ status: body.status })
        .where(eq(diningTables.id, body.tableId))
        .returning();
      if (body.status === 'VACANT') {
        await db
          .update(kitchenTickets)
          .set({ status: 'CLOSED', closedAt: new Date() })
          .where(eq(kitchenTickets.tableId, body.tableId));
      }
      return NextResponse.json({ success: true, table });
    }

    if (action === 'create_kot') {
      const items = (body.items || []) as Array<{ name: string; qty: number; notes?: string; price: number }>;
      const total = items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
      const [ticket] = await db
        .insert(kitchenTickets)
        .values({
          kotNumber: body.kotNumber || `KOT-${Date.now().toString().slice(-4)}`,
          tableId: body.tableId || null,
          waiterName: body.waiterName || 'Waiter',
          itemsJson: items,
          totalAmount: total.toFixed(2),
          status: 'OPEN',
        })
        .returning();
      if (body.tableId) {
        await db.update(diningTables).set({ status: 'ORDERED' }).where(eq(diningTables.id, body.tableId));
      }
      return NextResponse.json({ success: true, ticket });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await actor();
    const body = await req.json();

    if (body.action === 'update_table') {
      const [table] = await db
        .update(diningTables)
        .set({
          name: body.name,
          capacity: body.capacity != null ? Number(body.capacity) : undefined,
          sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
          status: body.status,
        })
        .where(eq(diningTables.id, body.tableId))
        .returning();
      return NextResponse.json({ success: true, table });
    }

    if (body.action === 'close_kot') {
      const [ticket] = await db
        .update(kitchenTickets)
        .set({ status: 'CLOSED', closedAt: new Date() })
        .where(eq(kitchenTickets.id, body.ticketId))
        .returning();
      if (ticket?.tableId) {
        await db.update(diningTables).set({ status: 'VACANT' }).where(eq(diningTables.id, ticket.tableId));
      }
      return NextResponse.json({ success: true, ticket });
    }

    if (body.action === 'mark_fired') {
      const where = body.ticketId
        ? eq(kitchenTickets.id, body.ticketId)
        : eq(kitchenTickets.kotNumber, body.kotNumber);
      const [ticket] = await db.update(kitchenTickets).set({ status: 'FIRED' }).where(where).returning();
      if (ticket?.tableId) {
        await db.update(diningTables).set({ status: 'ORDERED' }).where(eq(diningTables.id, ticket.tableId));
      }
      return NextResponse.json({ success: true, ticket });
    }

    if (body.action === 'mark_served') {
      const where = body.ticketId
        ? eq(kitchenTickets.id, body.ticketId)
        : eq(kitchenTickets.kotNumber, body.kotNumber);
      const [ticket] = await db.update(kitchenTickets).set({ status: 'SERVED' }).where(where).returning();
      if (ticket) {
        const items = (ticket.itemsJson as Array<{ productId?: string; qty: number }>) || [];
        await db.transaction(async (tx) => {
          for (const item of items) {
            if (item.productId) {
              await depleteRecipeForProduct(tx, item.productId, item.qty || 1, ticket.kotNumber);
            }
          }
        });
      }
      if (ticket?.tableId) {
        await db.update(diningTables).set({ status: 'SERVED' }).where(eq(diningTables.id, ticket.tableId));
      }
      const [branch] = await db.select().from(branches).limit(1);
      const lowStockAlerts = branch ? await checkRecipeLowStock(db, branch.id).catch(() => []) : [];
      return NextResponse.json({ success: true, ticket, lowStockAlerts });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
