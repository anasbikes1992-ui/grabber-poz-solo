import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { orders, payments, registers, shifts, users } from '@/db/schema';

export type OpenShiftInput = {
  registerId?: string;
  branchId?: string;
  cashierId: string;
  openingFloat?: number;
};

export type CloseShiftInput = {
  shiftId: string;
  closingCash: number;
  actualCard?: number;
};

async function resolveRegisterId(registerId?: string, branchId?: string): Promise<string> {
  if (registerId) {
    const [reg] = await db.select().from(registers).where(eq(registers.id, registerId)).limit(1);
    if (!reg) throw Object.assign(new Error('Register not found'), { status: 404 });
    return reg.id;
  }
  if (branchId) {
    const [reg] = await db
      .select()
      .from(registers)
      .where(and(eq(registers.branchId, branchId), eq(registers.active, true)))
      .limit(1);
    if (reg) return reg.id;
  }
  const [fallback] = await db.select().from(registers).where(eq(registers.active, true)).limit(1);
  if (!fallback) {
    throw Object.assign(new Error('No register configured — run POST /api/seed first'), { status: 400 });
  }
  return fallback.id;
}

export async function getOpenShift(registerId?: string) {
  const conditions = [eq(shifts.status, 'OPEN')];
  if (registerId) {
    conditions.push(eq(shifts.registerId, registerId));
  }
  const [shift] = await db
    .select()
    .from(shifts)
    .where(and(...conditions))
    .orderBy(sql`${shifts.openedAt} DESC`)
    .limit(1);
  return shift ?? null;
}

export async function listRecentShifts(limit = 20) {
  return db.select().from(shifts).orderBy(sql`${shifts.openedAt} DESC`).limit(limit);
}

export async function openShift(input: OpenShiftInput) {
  const registerId = await resolveRegisterId(input.registerId, input.branchId);

  const existing = await getOpenShift(registerId);
  if (existing) {
    return { shift: existing, reused: true as const };
  }

  const [cashier] = await db.select().from(users).where(eq(users.id, input.cashierId)).limit(1);
  if (!cashier?.active) {
    throw Object.assign(new Error('Cashier not found or inactive'), { status: 400 });
  }

  const [shift] = await db
    .insert(shifts)
    .values({
      registerId,
      cashierId: input.cashierId,
      openingFloat: String((input.openingFloat ?? 0).toFixed(2)),
      status: 'OPEN',
    })
    .returning();

  return { shift, reused: false as const };
}

export async function closeShift(input: CloseShiftInput) {
  return db.transaction(async (tx) => {
    const [shift] = await tx.select().from(shifts).where(eq(shifts.id, input.shiftId)).limit(1);
    if (!shift) throw Object.assign(new Error('Shift not found'), { status: 404 });
    if (shift.status === 'CLOSED') {
      throw Object.assign(new Error('Shift already closed'), { status: 409 });
    }

    const shiftOrders = await tx.select().from(orders).where(eq(orders.shiftId, shift.id));
    const orderIds = shiftOrders.map((o) => o.id);

    let cashSales = 0;
    let cardSales = 0;
    let creditSales = 0;

    if (orderIds.length) {
      const payRows = await tx.select().from(payments).where(inArray(payments.orderId, orderIds));
      for (const p of payRows) {
        const amt = Number(p.amount);
        if (p.method === 'CASH') cashSales += amt;
        else if (p.method === 'CARD') cardSales += amt;
        else if (p.method === 'CREDIT') creditSales += amt;
      }
    }

    const openingFloat = Number(shift.openingFloat);
    const expectedCash = openingFloat + cashSales;
    const variance = input.closingCash - expectedCash;

    const [closed] = await tx
      .update(shifts)
      .set({
        closingCash: String(input.closingCash.toFixed(2)),
        actualCard: String((input.actualCard ?? cardSales).toFixed(2)),
        variance: String(variance.toFixed(2)),
        status: 'CLOSED',
        closedAt: new Date(),
      })
      .where(eq(shifts.id, shift.id))
      .returning();

    const [register] = await tx.select().from(registers).where(eq(registers.id, shift.registerId)).limit(1);
    const [cashier] = await tx.select().from(users).where(eq(users.id, shift.cashierId)).limit(1);

    return {
      shift: closed,
      summary: {
        openingFloat,
        cashSales,
        cardSales,
        creditSales,
        expectedCash,
        closingCash: input.closingCash,
        variance,
      },
      register,
      cashier,
    };
  });
}
