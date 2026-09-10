import { asc, desc, eq, inArray } from 'drizzle-orm';
import { db, diningTables, kitchenTickets, branches } from '@/db';
import { depleteRecipeForProduct } from '@/lib/restaurant/recipe-bom';
import { checkRecipeLowStock } from '@/lib/restaurant/recipe-low-stock';

export type KdsTicketItem = {
  productId?: string;
  name: string;
  qty: number;
  notes?: string;
  station?: 'KITCHEN' | 'GRILL' | 'BAR' | 'DESSERT' | 'PACKING';
  course?: 'STARTER' | 'MAIN' | 'DESSERT' | 'BEVERAGE';
  price: number;
  completed?: boolean;
};

export type KdsTicket = {
  id: string;
  kotNumber: string;
  tableId?: string | null;
  tableName?: string;
  waiterName?: string | null;
  status: 'OPEN' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CLOSED' | 'CANCELLED';
  items: KdsTicketItem[];
  totalAmount: number;
  createdAt: Date;
  elapsedMinutes: number;
  urgency: 'NORMAL' | 'WARNING' | 'CRITICAL';
  station?: string;
};

export async function getRestaurantFloorState() {
  const tables = await db
    .select()
    .from(diningTables)
    .where(eq(diningTables.active, true))
    .orderBy(asc(diningTables.sortOrder));

  const tickets = await db
    .select()
    .from(kitchenTickets)
    .where(inArray(kitchenTickets.status, ['OPEN', 'CONFIRMED', 'FIRED', 'PREPARING', 'READY']))
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
            status: openByTable.get(t.id)!.status,
          }
        : undefined,
    })),
    tickets,
  };
}

export async function getKdsState(stationFilter = 'ALL') {
  const tables = await db.select().from(diningTables);
  const tableMap = new Map(tables.map((t) => [t.id, t.name]));

  const activeTickets = await db
    .select()
    .from(kitchenTickets)
    .where(inArray(kitchenTickets.status, ['OPEN', 'CONFIRMED', 'FIRED', 'PREPARING', 'READY']))
    .orderBy(asc(kitchenTickets.createdAt))
    .limit(60);

  const recentCompleted = await db
    .select()
    .from(kitchenTickets)
    .where(eq(kitchenTickets.status, 'SERVED'))
    .orderBy(desc(kitchenTickets.createdAt))
    .limit(10);

  const now = Date.now();

  const mapTicket = (t: typeof activeTickets[0]): KdsTicket => {
    const rawItems = (t.itemsJson || []) as KdsTicketItem[];
    const items = rawItems.filter((i) => {
      if (!stationFilter || stationFilter === 'ALL') return true;
      const itemStation = i.station || 'KITCHEN';
      return itemStation.toUpperCase() === stationFilter.toUpperCase();
    });

    const elapsedMs = now - (t.createdAt ? new Date(t.createdAt).getTime() : now);
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const urgency: 'NORMAL' | 'WARNING' | 'CRITICAL' =
      elapsedMinutes > 20 ? 'CRITICAL' : elapsedMinutes > 10 ? 'WARNING' : 'NORMAL';

    let normalizedStatus = t.status as KdsTicket['status'];
    if (t.status === 'FIRED') normalizedStatus = 'PREPARING';

    return {
      id: t.id,
      kotNumber: t.kotNumber,
      tableId: t.tableId,
      tableName: t.tableId ? tableMap.get(t.tableId) || 'Table' : 'Takeaway / Quick Order',
      waiterName: t.waiterName,
      status: normalizedStatus,
      items,
      totalAmount: Number(t.totalAmount || 0),
      createdAt: t.createdAt || new Date(),
      elapsedMinutes,
      urgency,
      station: stationFilter,
    };
  };

  return {
    tickets: activeTickets.map(mapTicket).filter((t) => t.items.length > 0),
    recentCompleted: recentCompleted.map(mapTicket),
    metrics: {
      activeCount: activeTickets.length,
      criticalCount: activeTickets.filter((t) => {
        const ms = now - (t.createdAt ? new Date(t.createdAt).getTime() : now);
        return ms > 20 * 60000;
      }).length,
    },
  };
}

export async function bumpKdsTicket(ticketId: string) {
  const [ticket] = await db.select().from(kitchenTickets).where(eq(kitchenTickets.id, ticketId)).limit(1);
  if (!ticket) throw Object.assign(new Error('Kitchen ticket not found'), { status: 404 });

  let nextStatus: string;
  if (ticket.status === 'OPEN' || ticket.status === 'CONFIRMED') {
    nextStatus = 'PREPARING';
  } else if (ticket.status === 'PREPARING' || ticket.status === 'FIRED') {
    nextStatus = 'READY';
  } else if (ticket.status === 'READY') {
    nextStatus = 'SERVED';
  } else {
    nextStatus = 'SERVED';
  }

  const [updated] = await db
    .update(kitchenTickets)
    .set({ status: nextStatus, closedAt: nextStatus === 'SERVED' ? new Date() : null })
    .where(eq(kitchenTickets.id, ticketId))
    .returning();

  if (nextStatus === 'SERVED') {
    const items = (ticket.itemsJson as Array<{ productId?: string; qty: number }>) || [];
    await db.transaction(async (tx) => {
      for (const item of items) {
        if (item.productId) {
          await depleteRecipeForProduct(tx, item.productId, item.qty || 1, ticket.kotNumber);
        }
      }
    });

    if (ticket.tableId) {
      await db.update(diningTables).set({ status: 'SERVED' }).where(eq(diningTables.id, ticket.tableId));
    }
  } else if (ticket.tableId) {
    await db.update(diningTables).set({ status: 'ORDERED' }).where(eq(diningTables.id, ticket.tableId));
  }

  return { ticket: updated, previousStatus: ticket.status, newStatus: nextStatus };
}

export async function reopenKdsTicket(ticketId: string) {
  const [ticket] = await db.select().from(kitchenTickets).where(eq(kitchenTickets.id, ticketId)).limit(1);
  if (!ticket) throw Object.assign(new Error('Kitchen ticket not found'), { status: 404 });

  const [updated] = await db
    .update(kitchenTickets)
    .set({ status: 'PREPARING', closedAt: null })
    .where(eq(kitchenTickets.id, ticketId))
    .returning();

  if (ticket.tableId) {
    await db.update(diningTables).set({ status: 'ORDERED' }).where(eq(diningTables.id, ticket.tableId));
  }

  return { ticket: updated };
}

export async function handleRestaurantPost(body: Record<string, unknown>) {
  const action = (body.action as string) || 'create_table';

  if (action === 'seed_floor') {
    const existing = await db.select().from(diningTables);
    if (existing.length) {
      return { reused: true, tables: existing };
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
    return { tables: rows, reused: false };
  }

  if (action === 'create_table') {
    const [branch] = await db.select().from(branches).limit(1);
    const [table] = await db
      .insert(diningTables)
      .values({
        name: String(body.name || 'New Table'),
        capacity: Math.max(1, Number(body.capacity || 4)),
        sortOrder: Math.max(0, Number(body.sortOrder || 1)),
        branchId: (body.branchId as string) || branch?.id || null,
        status: (body.status as string) || 'VACANT',
        active: true,
      })
      .returning();
    return { table };
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
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems.map((i: { name?: string; qty?: number; notes?: string; price?: number; station?: string; course?: string; productId?: string }) => ({
      productId: i.productId,
      name: String(i.name || 'Item'),
      qty: Math.max(1, Number(i.qty || 1)),
      price: Math.max(0, Number(i.price || 0)),
      notes: i.notes || undefined,
      station: i.station || 'KITCHEN',
      course: i.course || 'MAIN',
    }));

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

  if (action === 'bump_kds') {
    return await bumpKdsTicket(String(body.ticketId));
  }

  if (action === 'reopen_kds') {
    return await reopenKdsTicket(String(body.ticketId));
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
    const [ticket] = await db.update(kitchenTickets).set({ status: 'PREPARING' }).where(where).returning();
    if (ticket?.tableId) {
      await db.update(diningTables).set({ status: 'ORDERED' }).where(eq(diningTables.id, ticket.tableId));
    }
    return { ticket };
  }

  if (body.action === 'mark_served' || body.action === 'bump') {
    return await bumpKdsTicket(String(body.ticketId || ''));
  }

  throw Object.assign(new Error('Unknown action'), { status: 400 });
}
