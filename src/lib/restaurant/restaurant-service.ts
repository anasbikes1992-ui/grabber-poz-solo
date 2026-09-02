import { asc, desc, eq } from 'drizzle-orm';
import { db, diningTables, kitchenTickets, branches } from '@/db';
import { depleteRecipeForProduct } from '@/lib/restaurant/recipe-bom';
import { checkRecipeLowStock } from '@/lib/restaurant/recipe-low-stock';

export async function getRestaurantFloorState() {
  const tables = await db
    .select()
    .from(diningTables)
    .where(eq(diningTables.active, true))
    .orderBy(asc(diningTables.sortOrder));
  const tickets = await db
    .select()
    .from(kitchenTickets)
    .where(eq(kitchenTickets.status, 'OPEN'))
    .orderBy(desc(kitchenTickets.createdAt))
    .limit(50);
  const openByTable = new Map(tickets.filter((t) => t.tableId).map((t) => [t.tableId!, t]));
  return {
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
  };
}

export async function handleRestaurantPost(body: Record<string, unknown>) {
  const action = (body.action as string) || 'create_table';

  if (action === 'seed_floor') {
    const existing = await db.select().from(diningTables).limit(1);
    if (existing.length) {
      return { reused: true };
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
    return { tables: rows };
  }

  if (action === 'set_status') {
    const [table] = await db
      .update(diningTables)
      .set({ status: body.status as string })
      .where(eq(diningTables.id, body.tableId as string))
      .returning();
    if (body.status === 'VACANT') {
      await db
        .update(kitchenTickets)
        .set({ status: 'CLOSED', closedAt: new Date() })
        .where(eq(kitchenTickets.tableId, body.tableId as string));
    }
    return { table };
  }

  if (action === 'create_kot') {
    const items = (body.items || []) as Array<{ name: string; qty: number; notes?: string; price: number }>;
    const total = items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
    const [ticket] = await db
      .insert(kitchenTickets)
      .values({
        kotNumber: (body.kotNumber as string) || `KOT-${Date.now().toString().slice(-4)}`,
        tableId: (body.tableId as string) || null,
        waiterName: (body.waiterName as string) || 'Waiter',
        itemsJson: items,
        totalAmount: total.toFixed(2),
        status: 'OPEN',
      })
      .returning();
    if (body.tableId) {
      await db.update(diningTables).set({ status: 'ORDERED' }).where(eq(diningTables.id, body.tableId as string));
    }
    return { ticket };
  }

  throw Object.assign(new Error('Unknown action'), { status: 400 });
}

export async function handleRestaurantPatch(body: Record<string, unknown>) {
  if (body.action === 'update_table') {
    const [table] = await db
      .update(diningTables)
      .set({
        name: body.name as string | undefined,
        capacity: body.capacity != null ? Number(body.capacity) : undefined,
        sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
        status: body.status as string | undefined,
      })
      .where(eq(diningTables.id, body.tableId as string))
      .returning();
    return { table };
  }

  if (body.action === 'close_kot') {
    const [ticket] = await db
      .update(kitchenTickets)
      .set({ status: 'CLOSED', closedAt: new Date() })
      .where(eq(kitchenTickets.id, body.ticketId as string))
      .returning();
    if (ticket?.tableId) {
      await db.update(diningTables).set({ status: 'VACANT' }).where(eq(diningTables.id, ticket.tableId));
    }
    return { ticket };
  }

  if (body.action === 'mark_fired') {
    const where = body.ticketId
      ? eq(kitchenTickets.id, body.ticketId as string)
      : eq(kitchenTickets.kotNumber, body.kotNumber as string);
    const [ticket] = await db.update(kitchenTickets).set({ status: 'FIRED' }).where(where).returning();
    if (ticket?.tableId) {
      await db.update(diningTables).set({ status: 'ORDERED' }).where(eq(diningTables.id, ticket.tableId));
    }
    return { ticket };
  }

  if (body.action === 'mark_served') {
    const where = body.ticketId
      ? eq(kitchenTickets.id, body.ticketId as string)
      : eq(kitchenTickets.kotNumber, body.kotNumber as string);
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
    return { ticket, lowStockAlerts };
  }

  throw Object.assign(new Error('Unknown action'), { status: 400 });
}
