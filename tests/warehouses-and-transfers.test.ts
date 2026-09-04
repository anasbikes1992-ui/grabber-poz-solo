import { describe, it, expect } from 'vitest';
import { createDraftTransfer, cancelTransfer } from '@/lib/inventory/transfer-workflow';

describe('Warehouse & Multi-Location Stock Transfer Invariants', () => {
  it('rejects transfer when source and destination locations are identical', async () => {
    const mockTx: any = {
      insert: () => mockTx,
      values: () => mockTx,
      returning: async () => [{ id: 'tr-1' }],
    };

    await expect(
      createDraftTransfer(mockTx, {
        transferNumber: 'TRF-TEST-01',
        fromLocationType: 'WAREHOUSE',
        fromLocationId: 'loc-001',
        toLocationType: 'WAREHOUSE',
        toLocationId: 'loc-001', // Identical!
        items: [{ productId: 'p1', quantity: 10 }],
      }),
    ).rejects.toThrow(/Source and destination locations must be different/i);
  });

  it('permits transfer between different locations of same type (WAREHOUSE <-> WAREHOUSE)', async () => {
    const linesInserted: any[] = [];
    const mockTx: any = {
      insert: (table: any) => ({
        values: (val: any) => ({
          returning: async () => {
            return [{ id: 'tr-wh-wh', status: 'DRAFT', ...val }];
          },
        }),
      }),
    };

    // Need to handle tx.insert for transfers and transferLines
    let transferCreated: any = null;
    const customTx: any = {
      insert: () => ({
        values: (val: any) => {
          if (!transferCreated) {
            transferCreated = { id: 'tr-wh-wh', ...val };
            return {
              returning: async () => [transferCreated],
            };
          }
          linesInserted.push(val);
          return Promise.resolve();
        },
      }),
    };

    const res = await createDraftTransfer(customTx, {
      transferNumber: 'TRF-WH-02',
      fromLocationType: 'WAREHOUSE',
      fromLocationId: 'wh-main',
      toLocationType: 'WAREHOUSE',
      toLocationId: 'wh-secondary',
      items: [{ productId: 'prod-100', quantity: 25 }],
    });

    expect(res.id).toBe('tr-wh-wh');
    expect(res.status).toBe('DRAFT');
    expect(res.fromLocationId).toBe('wh-main');
    expect(res.toLocationId).toBe('wh-secondary');
    expect(linesInserted.length).toBe(1);
    expect(linesInserted[0].quantity).toBe(25);
  });

  it('rejects cancelTransfer on a transfer that is not in DRAFT/REQUESTED status', async () => {
    const mockTx: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'tr-done', status: 'RECEIVED' }],
          }),
        }),
      }),
    };

    await expect(cancelTransfer(mockTx, 'tr-done')).rejects.toThrow(/Cannot cancel transfer in status RECEIVED/i);
  });

  it('allows cancelTransfer on a transfer in DRAFT status', async () => {
    const mockTx: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'tr-draft', status: 'DRAFT' }],
          }),
        }),
      }),
      update: () => ({
        set: (vals: any) => ({
          where: () => ({
            returning: async () => [{ id: 'tr-draft', ...vals }],
          }),
        }),
      }),
    };

    const cancelled = await cancelTransfer(mockTx, 'tr-draft', 'actor-1');
    expect(cancelled.status).toBe('CANCELLED');
  });
});
