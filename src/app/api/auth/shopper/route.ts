import { NextResponse } from 'next/server';
import { desc, eq, or } from 'drizzle-orm';
import { db, customers, loyaltyMembers, orders, repairJobs } from '@/db';
import {
  clearCustomerSessionCookie,
  getCustomerSession,
  hashShopperPassword,
  setCustomerSessionCookie,
  verifyShopperPassword,
} from '@/lib/auth/customer-session';

/** Register or login shopper */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || 'login';
    const password = String(body.password || '');
    const phone = String(body.phone || '').trim();
    const email = body.email ? String(body.email).trim().toLowerCase() : '';
    const name = String(body.name || '').trim();

    if (password.length < 4) {
      return NextResponse.json({ success: false, error: 'Password min 4 characters' }, { status: 400 });
    }

    if (action === 'register') {
      if (!name || (!phone && !email)) {
        return NextResponse.json({ success: false, error: 'name and phone or email required' }, { status: 400 });
      }
      const phoneKey = phone || `email:${email}`;
      const existing = await db
        .select()
        .from(customers)
        .where(or(eq(customers.phone, phoneKey), email ? eq(customers.email, email) : eq(customers.phone, phoneKey)))
        .limit(1);
      if (existing[0]?.hashedPassword) {
        return NextResponse.json({ success: false, error: 'Account already exists — sign in' }, { status: 409 });
      }
      let customer = existing[0];
      if (!customer) {
        [customer] = await db
          .insert(customers)
          .values({
            name,
            phone: phoneKey,
            email: email || null,
            hashedPassword: hashShopperPassword(password),
            active: true,
          })
          .returning();
      } else {
        [customer] = await db
          .update(customers)
          .set({
            name,
            email: email || customer.email,
            hashedPassword: hashShopperPassword(password),
          })
          .where(eq(customers.id, customer.id))
          .returning();
      }
      await setCustomerSessionCookie({
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      });
      return NextResponse.json({
        success: true,
        registered: true,
        customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
      });
    }

    // login
    if (!phone && !email) {
      return NextResponse.json({ success: false, error: 'phone or email required' }, { status: 400 });
    }
    let [customer] = phone
      ? await db.select().from(customers).where(eq(customers.phone, phone)).limit(1)
      : await db.select().from(customers).where(eq(customers.email, email)).limit(1);

    // Dev fallback
    if (!customer && process.env.NODE_ENV !== 'production' && password === '1234') {
      await setCustomerSessionCookie({
        customerId: '00000000-0000-0000-0000-000000000099',
        name: 'Demo Shopper',
        email: email || 'shopper@localhost',
        phone: phone || '+94000000000',
      });
      return NextResponse.json({
        success: true,
        demo: true,
        customer: { name: 'Demo Shopper', email: email || 'shopper@localhost' },
      });
    }

    if (!customer || !customer.active) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 401 });
    }
    if (!customer.hashedPassword || !verifyShopperPassword(password, customer.hashedPassword)) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }

    await setCustomerSessionCookie({
      customerId: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    });

    return NextResponse.json({
      success: true,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ success: false, authenticated: false }, { status: 401 });

  try {
    const [cust] = await db.select().from(customers).where(eq(customers.id, session.customerId)).limit(1);
    if (!cust) return NextResponse.json({ success: false, authenticated: false }, { status: 401 });

    const rawPhone = cust.phone || session.phone || '';
    const cleanPhone = rawPhone.startsWith('email:') ? '' : rawPhone;

    // Fetch loyalty member info if available
    let loyaltyInfo = null;
    const [loyalty] = await db
      .select()
      .from(loyaltyMembers)
      .where(or(eq(loyaltyMembers.phone, rawPhone), cleanPhone ? eq(loyaltyMembers.phone, cleanPhone) : eq(loyaltyMembers.name, cust.name)))
      .limit(1);
    if (loyalty) {
      loyaltyInfo = {
        points: loyalty.points,
        tier: loyalty.tier,
        totalSpent: Number(loyalty.totalSpent || 0),
      };
    }

    // Fetch customer's recent orders
    const customerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, cust.id))
      .orderBy(desc(orders.createdAt))
      .limit(15);

    // Fetch customer's active or past repairs (matching customer phone)
    const customerRepairs = cleanPhone
      ? await db
          .select()
          .from(repairJobs)
          .where(eq(repairJobs.customerPhone, cleanPhone))
          .orderBy(desc(repairJobs.createdAt))
          .limit(10)
      : [];

    return NextResponse.json({
      success: true,
      authenticated: true,
      customer: {
        id: cust.id,
        name: cust.name,
        email: cust.email,
        phone: cleanPhone,
        address: cust.address || '',
        loyalty: loyaltyInfo,
      },
      orders: customerOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        grandTotal: Number(o.grandTotal),
        status: o.orderStatus,
        paymentStatus: o.paymentStatus,
        fulfillmentStatus: o.fulfillmentStatus,
        createdAt: o.createdAt,
      })),
      repairs: customerRepairs.map((r) => ({
        id: r.id,
        jobNumber: r.jobNumber,
        deviceModel: r.deviceModel,
        primaryFault: r.primaryFault,
        status: r.status,
        serviceCharge: Number(r.serviceCharge),
        partsAmount: Number(r.partsAmount),
        createdAt: r.createdAt,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: true,
      authenticated: true,
      customer: {
        id: session.customerId,
        name: session.name,
        email: session.email,
        phone: session.phone?.startsWith('email:') ? '' : session.phone,
        address: '',
      },
      orders: [],
      repairs: [],
    });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const name = body.name ? String(body.name).trim() : undefined;
    const phone = body.phone ? String(body.phone).trim() : undefined;
    const address = body.address !== undefined ? String(body.address).trim() : undefined;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (phone) {
      const existing = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
      if (existing.length > 0 && existing[0].id !== session.customerId) {
        return NextResponse.json({ success: false, error: 'Phone number already registered to another account' }, { status: 409 });
      }
      updateData.phone = phone;
    }

    if (Object.keys(updateData).length > 0) {
      const [updated] = await db
        .update(customers)
        .set(updateData)
        .where(eq(customers.id, session.customerId))
        .returning();

      if (updated) {
        await setCustomerSessionCookie({
          customerId: updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE() {
  await clearCustomerSessionCookie();
  return NextResponse.json({ success: true });
}
