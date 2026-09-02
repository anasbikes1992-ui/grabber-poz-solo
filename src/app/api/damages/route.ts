import { NextResponse } from 'next/server';
import { db, branches } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { deleteCollectionItem, listCollection, upsertCollectionItem } from '@/lib/db/app-collections';
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
    const damages = await listCollection<{ id: string } & Record<string, unknown>>('damages');
    return NextResponse.json({ success: true, damages });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
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

    const numQty = Number(body.quantity) || 1;
    const numCost = Number(body.unitCost) || 0;
    const payload = {
      id: `dmg_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      productId: body.productId ? String(body.productId) : '',
      productName: String(body.productName).trim(),
      barcode: body.barcode ? String(body.barcode).trim() : '',
      quantity: numQty,
      unitCost: numCost,
      totalLoss: numQty * numCost,
      reason: body.reason || 'DAMAGED_IN_STORE',
      remarks: body.remarks || '',
      photoUrl: body.photoUrl ? String(body.photoUrl).trim() : '',
      reportedBy: body.reportedBy || session?.name || 'Store Manager',
      status: 'PENDING' as const,
      recordedAt: new Date().toISOString(),
    };

    await upsertCollectionItem('damages', payload);
    return NextResponse.json({ success: true, damage: payload });
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
    await deleteCollectionItem('damages', id);
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

    const damages = await listCollection<{ id: string } & Record<string, unknown>>('damages');
    const existing = damages.find((d) => d.id === body.id);
    if (!existing) return NextResponse.json({ success: false, error: 'Damage record not found' }, { status: 404 });

    if (body.action === 'approve') {
      if (existing.status === 'APPROVED') {
        return NextResponse.json({ success: false, error: 'Already approved' }, { status: 409 });
      }
      const actorId = session && !isDemoUserId(session.userId) ? session.userId : null;
      const productId = String(existing.productId || '');
      const qty = Number(existing.quantity) || 1;

      if (productId) {
        const branchId = await resolveBranchId();
        await db.transaction(async (tx) => {
          await recordDamage(
            tx,
            { locationType: 'BRANCH', locationId: branchId },
            {
              productId,
              quantity: qty,
              unitCost: Number(existing.unitCost) || 0,
            },
            {
              referenceType: 'DAMAGE',
              referenceId: String(existing.id),
              actorId,
              notes: String(existing.reason || 'Damage write-off'),
            },
          );
        });
      }

      const journalEntryId = await postDamageWriteOff({
        damageId: String(existing.id),
        productName: String(existing.productName || 'Stock item'),
        totalLoss: Number(existing.totalLoss || 0),
        actorId,
      });
      const payload = {
        ...existing,
        status: 'APPROVED',
        approvedAt: new Date().toISOString(),
        approvedBy: session?.name || 'Manager',
        journalEntryId,
      };
      await upsertCollectionItem('damages', payload);
      return NextResponse.json({ success: true, damage: payload, journalEntryId });
    }

    if (body.action === 'update_status') {
      const status = String(body.status || '').toUpperCase();
      if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      const payload = { ...existing, status, updatedAt: new Date().toISOString() };
      await upsertCollectionItem('damages', payload);
      return NextResponse.json({ success: true, damage: payload });
    }

    if (body.photoUrl != null) {
      const payload = { ...existing, photoUrl: String(body.photoUrl).trim(), updatedAt: new Date().toISOString() };
      await upsertCollectionItem('damages', payload);
      return NextResponse.json({ success: true, damage: payload });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
