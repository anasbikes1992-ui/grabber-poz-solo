import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, deliveryRiders } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { assertValidRiderPhone, normalizeRiderPhone } from '@/lib/delivery/riders';

const riderSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(32).optional().nullable(),
  whatsappPhone: z.string().trim().min(9).max(32),
  active: z.boolean().optional(),
  homeBranchId: z.string().uuid().optional().nullable(),
  vehicleType: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const updateSchema = riderSchema.partial().extend({
  id: z.string().uuid(),
});

async function requireDeliveryStaff(mutate = false) {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = {
      userId: '00000000-0000-0000-0000-000000000001',
      email: 'dev@localhost',
      name: 'Dev',
      role: 'OWNER',
    };
  }
  if (!session) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  if (mutate) assertCanMutateCommerce(session);
  return session;
}

function toRiderPayload(input: z.infer<typeof riderSchema>) {
  const whatsappPhone = assertValidRiderPhone(input.whatsappPhone);
  return {
    name: input.name,
    phone: input.phone ? normalizeRiderPhone(input.phone) : null,
    whatsappPhone,
    active: input.active ?? true,
    homeBranchId: input.homeBranchId || null,
    vehicleType: input.vehicleType || null,
    notes: input.notes || null,
    updatedAt: new Date(),
  };
}

export async function GET() {
  try {
    await requireDeliveryStaff(false);
    const riders = await db.select().from(deliveryRiders).orderBy(desc(deliveryRiders.active), desc(deliveryRiders.createdAt));
    return NextResponse.json({ success: true, riders });
  } catch (err) {
    const e = err as { status?: number };
    return NextResponse.json({ success: false, error: 'Request failed' }, { status: e.status || 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireDeliveryStaff(true);
    const parsed = riderSchema.parse(await req.json());
    const [rider] = await db.insert(deliveryRiders).values(toRiderPayload(parsed)).returning();
    return NextResponse.json({ success: true, rider });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json({ success: false, error: e.status ? e.message : 'Failed to create rider' }, { status: e.status || 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireDeliveryStaff(true);
    const parsed = updateSchema.parse(await req.json());
    const updates: Partial<typeof deliveryRiders.$inferInsert> = { updatedAt: new Date() };
    if (parsed.name != null) updates.name = parsed.name;
    if (parsed.phone !== undefined) updates.phone = parsed.phone ? normalizeRiderPhone(parsed.phone) : null;
    if (parsed.whatsappPhone != null) updates.whatsappPhone = assertValidRiderPhone(parsed.whatsappPhone);
    if (parsed.active !== undefined) updates.active = parsed.active;
    if (parsed.homeBranchId !== undefined) updates.homeBranchId = parsed.homeBranchId || null;
    if (parsed.vehicleType !== undefined) updates.vehicleType = parsed.vehicleType || null;
    if (parsed.notes !== undefined) updates.notes = parsed.notes || null;

    const [rider] = await db.update(deliveryRiders).set(updates).where(eq(deliveryRiders.id, parsed.id)).returning();
    if (!rider) return NextResponse.json({ success: false, error: 'Rider not found' }, { status: 404 });
    return NextResponse.json({ success: true, rider });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json({ success: false, error: e.status ? e.message : 'Failed to update rider' }, { status: e.status || 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireDeliveryStaff(true);
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const [rider] = await db.update(deliveryRiders).set({ active: false, updatedAt: new Date() }).where(eq(deliveryRiders.id, id)).returning();
    if (!rider) return NextResponse.json({ success: false, error: 'Rider not found' }, { status: 404 });
    return NextResponse.json({ success: true, rider });
  } catch (err) {
    const e = err as { status?: number };
    return NextResponse.json({ success: false, error: 'Failed to disable rider' }, { status: e.status || 400 });
  }
}
