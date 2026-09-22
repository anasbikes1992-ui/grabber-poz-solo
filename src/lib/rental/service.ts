import { desc, eq, sql } from 'drizzle-orm';
import { db, rentalAssets, rentalContracts, rentalDeposits, rentalPeriods } from '@/db';
import { postDepositHold, postDepositRelease } from './deposit-gl';
import {
  assertCanActivateContract,
  assertCanDisputeContract,
  assertCanReturnContract,
  statusesAfterActivate,
  statusesAfterReturn,
} from './status';

function actorId(userId?: string | null): string | null {
  if (!userId || userId === '00000000-0000-0000-0000-000000000001') return null;
  return userId;
}

async function nextContractNumber(): Promise<string> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(rentalContracts);
  return `RNT-${String((count || 0) + 1).padStart(5, '0')}`;
}

export async function createAsset(input: {
  code: string;
  name: string;
  productId?: string | null;
  depositDefault?: number;
  dailyRate?: number;
  notes?: string | null;
}) {
  const code = String(input.code || '').trim();
  const name = String(input.name || '').trim();
  if (!code || !name) throw new Error('code and name required');

  const [asset] = await db
    .insert(rentalAssets)
    .values({
      code,
      name,
      productId: input.productId || null,
      depositDefault: Number(input.depositDefault || 0).toFixed(2),
      dailyRate: Number(input.dailyRate || 0).toFixed(2),
      notes: input.notes || null,
      status: 'AVAILABLE',
    })
    .returning();
  return asset;
}

export async function listAssets(limit = 100) {
  return db.select().from(rentalAssets).orderBy(desc(rentalAssets.createdAt)).limit(limit);
}

export async function updateAsset(
  id: string,
  patch: Partial<{ status: string; name: string; notes: string | null; dailyRate: number; depositDefault: number }>,
) {
  const [updated] = await db
    .update(rentalAssets)
    .set({
      status: patch.status,
      name: patch.name,
      notes: patch.notes,
      dailyRate: patch.dailyRate != null ? Number(patch.dailyRate).toFixed(2) : undefined,
      depositDefault: patch.depositDefault != null ? Number(patch.depositDefault).toFixed(2) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(rentalAssets.id, id))
    .returning();
  if (!updated) throw new Error('Asset not found');
  return updated;
}

export async function createContract(input: {
  assetId: string;
  customerName: string;
  customerPhone?: string | null;
  customerId?: string | null;
  startAt?: Date | string;
  endAt?: Date | string | null;
  depositAmount?: number;
  rateAmount?: number;
  createdBy?: string | null;
}) {
  const [asset] = await db.select().from(rentalAssets).where(eq(rentalAssets.id, input.assetId)).limit(1);
  if (!asset) throw new Error('Asset not found');
  if (asset.status !== 'AVAILABLE') {
    throw new Error(`Cannot create contract: asset status is ${asset.status}, must be AVAILABLE`);
  }

  const contractNumber = await nextContractNumber();
  const deposit =
    input.depositAmount != null ? Number(input.depositAmount) : Number(asset.depositDefault);
  const rate = input.rateAmount != null ? Number(input.rateAmount) : Number(asset.dailyRate);

  const [contract] = await db
    .insert(rentalContracts)
    .values({
      contractNumber,
      assetId: input.assetId,
      customerName: String(input.customerName || '').trim() || 'Walk-in',
      customerPhone: input.customerPhone || null,
      customerId: input.customerId || null,
      startAt: input.startAt ? new Date(input.startAt) : new Date(),
      endAt: input.endAt ? new Date(input.endAt) : null,
      depositAmount: deposit.toFixed(2),
      rateAmount: rate.toFixed(2),
      status: 'DRAFT',
      createdBy: actorId(input.createdBy),
    })
    .returning();

  if (deposit > 0) {
    await db.insert(rentalDeposits).values({
      contractId: contract.id,
      amount: deposit.toFixed(2),
      status: 'HELD',
    });
  }

  return contract;
}

export async function listContracts(limit = 100) {
  return db.select().from(rentalContracts).orderBy(desc(rentalContracts.createdAt)).limit(limit);
}

export async function activateContract(id: string, opts: { depositMethod?: string; createdBy?: string | null } = {}) {
  const [contract] = await db.select().from(rentalContracts).where(eq(rentalContracts.id, id)).limit(1);
  if (!contract) throw new Error('Contract not found');

  const [asset] = await db.select().from(rentalAssets).where(eq(rentalAssets.id, contract.assetId)).limit(1);
  if (!asset) throw new Error('Asset not found');

  assertCanActivateContract(contract.status, asset.status);
  const next = statusesAfterActivate();

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(rentalContracts)
      .set({ status: next.contract, updatedAt: new Date() })
      .where(eq(rentalContracts.id, id))
      .returning();

    await tx
      .update(rentalAssets)
      .set({ status: next.asset, updatedAt: new Date() })
      .where(eq(rentalAssets.id, contract.assetId));

    const deposits = await tx.select().from(rentalDeposits).where(eq(rentalDeposits.contractId, id));
    for (const d of deposits) {
      if (d.status === 'HELD' && !d.holdJournalEntryId) {
        await postDepositHold(tx, {
          depositId: d.id,
          contractId: id,
          amount: Number(d.amount),
          method: opts.depositMethod,
          createdBy: opts.createdBy,
        });
      }
    }

    return updated;
  });
}

export async function returnContract(
  id: string,
  opts: { forfeitDeposit?: boolean; depositMethod?: string; createdBy?: string | null } = {},
) {
  const [contract] = await db.select().from(rentalContracts).where(eq(rentalContracts.id, id)).limit(1);
  if (!contract) throw new Error('Contract not found');
  assertCanReturnContract(contract.status);
  const next = statusesAfterReturn();
  const charges = estimateContractCharges(contract);
  const periodEnd = new Date();

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(rentalContracts)
      .set({ status: next.contract, endAt: periodEnd, updatedAt: new Date() })
      .where(eq(rentalContracts.id, id))
      .returning();

    await tx
      .update(rentalAssets)
      .set({ status: next.asset, updatedAt: new Date() })
      .where(eq(rentalAssets.id, contract.assetId));

    await tx.insert(rentalPeriods).values({
      contractId: id,
      periodStart: new Date(contract.startAt),
      periodEnd,
      amount: charges.rentalCharge.toFixed(2),
    });

    const deposits = await tx.select().from(rentalDeposits).where(eq(rentalDeposits.contractId, id));
    for (const d of deposits) {
      if (d.status === 'HELD') {
        await postDepositRelease(tx, {
          depositId: d.id,
          contractId: id,
          amount: Number(d.amount),
          forfeit: Boolean(opts.forfeitDeposit),
          method: opts.depositMethod,
          createdBy: opts.createdBy,
        });
        await tx
          .update(rentalDeposits)
          .set({
            status: opts.forfeitDeposit ? 'FORFEITED' : 'REFUNDED',
            updatedAt: new Date(),
          })
          .where(eq(rentalDeposits.id, d.id));
      }
    }

    return { ...updated, settlement: charges };
  });
}

/** Billable days × daily rate (minimum 1 day). */
export function estimateContractCharges(contract: {
  startAt: Date | string;
  endAt?: Date | string | null;
  rateAmount: string | number;
}) {
  const start = new Date(contract.startAt).getTime();
  const end = new Date(contract.endAt || Date.now()).getTime();
  const ms = Math.max(0, end - start);
  const billableDays = Math.max(1, Math.ceil(ms / 86_400_000));
  const dailyRate = Number(contract.rateAmount || 0);
  const rentalCharge = Math.round(billableDays * dailyRate * 100) / 100;
  return { billableDays, dailyRate, rentalCharge };
}

export async function listOverdueContracts(asOf: Date = new Date()) {
  const rows = await db
    .select()
    .from(rentalContracts)
    .where(eq(rentalContracts.status, 'ACTIVE'))
    .orderBy(desc(rentalContracts.createdAt));
  return rows.filter((c) => c.endAt && new Date(c.endAt).getTime() < asOf.getTime());
}

export async function disputeContract(id: string) {
  const [contract] = await db.select().from(rentalContracts).where(eq(rentalContracts.id, id)).limit(1);
  if (!contract) throw new Error('Contract not found');
  assertCanDisputeContract(contract.status);

  const [updated] = await db
    .update(rentalContracts)
    .set({ status: 'DISPUTED', updatedAt: new Date() })
    .where(eq(rentalContracts.id, id))
    .returning();
  return updated;
}
