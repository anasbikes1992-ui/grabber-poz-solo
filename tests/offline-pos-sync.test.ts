import { describe, it, expect } from 'vitest';
import { OfflinePosSyncEngine, type OfflineSaleTransaction } from '@/lib/pos/offline-sync';

describe('Offline POS Resilience & Sync Engine', () => {
  it('generates unique client-side transaction keys', () => {
    const txId1 = OfflinePosSyncEngine.generateClientTxId('reg-01');
    const txId2 = OfflinePosSyncEngine.generateClientTxId('reg-01');
    expect(txId1).not.toBe(txId2);
    expect(txId1).toContain('tx_reg-01');
  });

  it('validates offline transaction integrity before syncing', () => {
    const validTx: OfflineSaleTransaction = {
      clientTxId: 'tx_reg-01_123456_abc',
      branchId: 'branch-01',
      registerId: 'reg-01',
      cashierId: 'user-01',
      channel: 'POS',
      items: [
        { productId: 'prod-01', name: 'USB-C Cable', unitPrice: 1500, quantity: 2 },
      ],
      paymentMethod: 'CASH',
      amountPaid: 3000,
      offlineTimestamp: new Date().toISOString(),
      syncStatus: 'PENDING',
      retryCount: 0,
    };

    const result = OfflinePosSyncEngine.validateOfflineTransaction(validTx);
    expect(result.valid).toBe(true);

    const invalidTx: OfflineSaleTransaction = {
      ...validTx,
      items: [], // Empty cart
    };
    expect(OfflinePosSyncEngine.validateOfflineTransaction(invalidTx).valid).toBe(false);
  });
});
