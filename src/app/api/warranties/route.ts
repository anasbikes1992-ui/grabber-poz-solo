import { NextResponse } from 'next/server';
import { desc, eq, or, ilike } from 'drizzle-orm';
import { db, serialNumbers, products, warrantyClaims } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    let rows;
    if (query) {
      rows = await db
        .select()
        .from(serialNumbers)
        .where(
          or(
            ilike(serialNumbers.serial, `%${query}%`),
            ilike(serialNumbers.customerName, `%${query}%`),
            ilike(serialNumbers.productName, `%${query}%`),
          ),
        )
        .orderBy(desc(serialNumbers.createdAt))
        .limit(50);
    } else {
      rows = await db.select().from(serialNumbers).orderBy(desc(serialNumbers.createdAt)).limit(100);
    }

    const warranties = rows.map((r) => ({
      id: r.id,
      serial: r.serial,
      productId: r.productId,
      productName: r.productName || 'Device',
      customerName: r.customerName || 'Walk-in Customer',
      customerPhone: r.customerPhone || null,
      status: r.status,
      expiresAt: r.warrantyExpires ? r.warrantyExpires.toISOString().slice(0, 10) : null,
      notes: r.notes,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, warranties });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message, warranties: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    if (body.action === 'create_claim') {
      const serial = String(body.serial || '').trim().toUpperCase();
      const issueDescription = String(body.issueDescription || '').trim();
      if (!serial || !issueDescription) return NextResponse.json({ success: false, error: 'serial and issueDescription required' }, { status: 400 });
      const [serialRow] = await db.select().from(serialNumbers).where(eq(serialNumbers.serial, serial)).limit(1);
      if (!serialRow) return NextResponse.json({ success: false, error: 'Serial / IMEI not found' }, { status: 404 });
      if (!serialRow.warrantyExpires || serialRow.warrantyExpires.getTime() < Date.now()) return NextResponse.json({ success: false, error: 'Warranty has expired' }, { status: 409 });
      const [claim] = await db.insert(warrantyClaims).values({
        claimNumber: `WCL-${Date.now().toString().slice(-8)}`,
        serialId: serialRow.id,
        customerName: serialRow.customerName || String(body.customerName || 'Customer'),
        customerPhone: serialRow.customerPhone || String(body.customerPhone || '').trim() || null,
        issueDescription,
        createdBy: session && !isDemoUserId(session.userId) ? session.userId : null,
      }).returning();
      return NextResponse.json({ success: true, claim }, { status: 201 });
    }
    if (body.action === 'update_claim') {
      const claimId = String(body.claimId || '').trim();
      const status = String(body.status || '').trim().toUpperCase();
      const allowed = ['SUBMITTED', 'APPROVED', 'REJECTED', 'IN_REPAIR', 'RESOLVED', 'CLOSED'];
      if (!claimId || !allowed.includes(status)) return NextResponse.json({ success: false, error: 'claimId and valid status required' }, { status: 400 });
      const [claim] = await db.update(warrantyClaims).set({
        status,
        resolution: body.resolution ? String(body.resolution).trim() : undefined,
        repairJobId: body.repairJobId ? String(body.repairJobId) : undefined,
        resolvedBy: ['RESOLVED', 'CLOSED'].includes(status) && session && !isDemoUserId(session.userId) ? session.userId : undefined,
        updatedAt: new Date(),
      }).where(eq(warrantyClaims.id, claimId)).returning();
      if (!claim) return NextResponse.json({ success: false, error: 'Claim not found' }, { status: 404 });
      return NextResponse.json({ success: true, claim });
    }
    const serial = String(body.serial || '').trim();
    const productName = String(body.productName || '').trim();
    const customerName = String(body.customerName || '').trim();
    if (!serial || !productName || !customerName) {
      return NextResponse.json({ success: false, error: 'serial, productName, and customerName required' }, { status: 400 });
    }

    const actorId = session && !isDemoUserId(session.userId) ? session.userId : null;
    const expiresAt = body.expiresAt
      ? new Date(body.expiresAt)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // Resolve or find product ID
    let resolvedProductId = body.productId ? String(body.productId) : null;
    if (!resolvedProductId) {
      const [existingProd] = await db
        .select({ id: products.id })
        .from(products)
        .where(ilike(products.name, `%${productName}%`))
        .limit(1);
      if (existingProd) {
        resolvedProductId = existingProd.id;
      } else {
        const [anyProd] = await db.select({ id: products.id }).from(products).limit(1);
        if (anyProd) resolvedProductId = anyProd.id;
      }
    }

    if (!resolvedProductId) {
      return NextResponse.json({ success: false, error: 'Cannot register warranty without an active product' }, { status: 400 });
    }

    // Upsert serial record
    const [existingSerial] = await db
      .select()
      .from(serialNumbers)
      .where(eq(serialNumbers.serial, serial))
      .limit(1);

    let record;
    if (existingSerial) {
      const [updated] = await db
        .update(serialNumbers)
        .set({
          customerName,
          customerPhone: body.customerPhone ? String(body.customerPhone).trim() : existingSerial.customerPhone,
          productName,
          warrantyExpires: expiresAt,
          notes: body.notes || existingSerial.notes,
          status: 'SOLD',
          registeredBy: actorId,
        })
        .where(eq(serialNumbers.id, existingSerial.id))
        .returning();
      record = updated;
    } else {
      const [inserted] = await db
        .insert(serialNumbers)
        .values({
          serial,
          productId: resolvedProductId,
          productName,
          customerName,
          customerPhone: body.customerPhone ? String(body.customerPhone).trim() : null,
          status: 'SOLD',
          warrantyExpires: expiresAt,
          notes: body.notes || null,
          registeredBy: actorId,
        })
        .returning();
      record = inserted;
    }

    return NextResponse.json({
      success: true,
      warranty: {
        id: record.id,
        serial: record.serial,
        productName: record.productName,
        customerName: record.customerName,
        expiresAt: record.warrantyExpires ? record.warrantyExpires.toISOString().slice(0, 10) : null,
        notes: record.notes,
        createdAt: record.createdAt ? record.createdAt.toISOString() : new Date().toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
