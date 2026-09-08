import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, damages, branches, products } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { postDamageWriteOff } from '@/lib/damages/damage-write-off';
import { recordDamage } from '@/lib/inventory/stock-service';

const ALLOWED_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

async function resolveBranchId() {
  const [branch] = await db.select({ id: branches.id }).from(branches).limit(1);
  if (!branch) throw new Error('No branch configured');
  return branch.id;
}

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const rows = await db.select().from(damages).orderBy(desc(damages.createdAt)).limit(100);
    return NextResponse.json({ success: true, damages: rows });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message, damages: [] }, { status: 500 });
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
    if (!body.productName || !body.quantity) {
      return NextResponse.json({ success: false, error: 'Product and quantity are required' }, { status: 400 });
    }

    const numQty = Math.max(1, Number(body.quantity) || 1);
    const numCost = Math.max(0, Number(body.unitCost) || 0);
    const totalLoss = (numQty * numCost).toFixed(2);
    const damageNumber = (body.damageNumber as string) || `DMG-${Date.now().toString().slice(-6)}`;
    const branchId = await resolveBranchId();

    let productId = body.productId ? String(body.productId) : null;
    if (productId) {
      const [prod] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
      if (!prod) productId = null;
    }

    const [row] = await db
      .insert(damages)
      .values({
        damageNumber,
        productId,
        variantId: body.variantId ? String(body.variantId) : null,
        productName: String(body.productName).trim(),
        barcode: body.barcode ? String(body.barcode).trim() : null,
        locationType: 'BRANCH',
        locationId: branchId,
        quantity: numQty,
        unitCost: numCost.toFixed(2),
        totalLoss,
        reason: body.reason || 'DAMAGED_IN_STORE',
        remarks: body.remarks || null,
        photoUrl: body.photoUrl ? String(body.photoUrl).trim() : null,
        reportedBy: body.reportedBy || session?.name || 'Store Manager',
        status: 'PENDING',
      })
      .returning();

    return NextResponse.json({ success: true, damage: row });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    assertCanMutateCommerce(await getSession());
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    
    await db.delete(damages).where(eq(damages.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const [existing] = await db.select().from(damages).where(eq(damages.id, body.id)).limit(1);
    if (!existing) return NextResponse.json({ success: false, error: 'Damage record not found' }, { status: 404 });

    if (body.action === 'approve') {
      if (existing.status === 'APPROVED') {
        return NextResponse.json({ success: false, error: 'Already approved' }, { status: 409 });
      }
      const actorId = session && !isDemoUserId(session.userId) ? session.userId : null;
      const qty = existing.quantity;

      if (existing.productId) {
        const branchId = existing.locationId || (await resolveBranchId());
        await db.transaction(async (tx) => {
          await recordDamage(
            tx,
            { locationType: 'BRANCH', locationId: branchId },
            {
              productId: existing.productId!,
              variantId: existing.variantId || undefined,
              quantity: qty,
              unitCost: Number(existing.unitCost),
            },
            {
              referenceType: 'DAMAGE',
              referenceId: existing.id,
              actorId,
              notes: String(existing.reason || 'Damage write-off'),
            },
          );
        });
      }

      const journalEntryId = await postDamageWriteOff({
        damageId: existing.id,
        productName: existing.productName,
        totalLoss: Number(existing.totalLoss),
        actorId,
      });

      const [updated] = await db
        .update(damages)
        .set({
          status: 'APPROVED',
          approvedBy: actorId,
          journalEntryId: journalEntryId || null,
          updatedAt: new Date(),
        })
        .where(eq(damages.id, existing.id))
        .returning();

      return NextResponse.json({ success: true, damage: updated, journalEntryId });
    }

    if (body.action === 'update_status') {
      const status = String(body.status || '').toUpperCase();
      if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      const [updated] = await db
        .update(damages)
        .set({ status, updatedAt: new Date() })
        .where(eq(damages.id, existing.id))
        .returning();
      return NextResponse.json({ success: true, damage: updated });
    }

    if (body.photoUrl != null) {
      const [updated] = await db
        .update(damages)
        .set({ photoUrl: String(body.photoUrl).trim(), updatedAt: new Date() })
        .where(eq(damages.id, existing.id))
        .returning();
      return NextResponse.json({ success: true, damage: updated });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
