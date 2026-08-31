import { NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';
import { db, customers } from '@/db';
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
  return NextResponse.json({
    success: true,
    authenticated: true,
    customer: {
      id: session.customerId,
      name: session.name,
      email: session.email,
      phone: session.phone,
    },
  });
}

export async function DELETE() {
  await clearCustomerSessionCookie();
  return NextResponse.json({ success: true });
}
