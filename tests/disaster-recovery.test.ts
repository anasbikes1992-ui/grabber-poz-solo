import { describe, it, expect } from 'vitest';
import {
  encryptBackupData,
  decryptBackupData,
  verifyRestoredDatabaseIntegrity,
  DISASTER_RECOVERY_SLA,
} from '@/lib/backup/crypto-backup';

describe('Disaster Recovery & Backup/Restore Certification (DR-001 to DR-007)', () => {
  const testSecretKey = 'prod-recovery-secret-aes-key-9988';

  const mockDatabaseDataset = {
    exportedAt: new Date().toISOString(),
    source: 'postgres',
    counts: {
      orders: 2,
      journalLines: 4,
      stockBalances: 3,
    },
    data: {
      orders: [
        { id: 'ord-1', orderNumber: 'ORD-1001', grandTotal: '15000.00' },
        { id: 'ord-2', orderNumber: 'ORD-1002', grandTotal: '4500.00' },
      ],
      journalLines: [
        { id: 'jl-1', entryId: 'je-1', type: 'DEBIT', amount: 15000 },
        { id: 'jl-2', entryId: 'je-1', type: 'CREDIT', amount: 15000 },
        { id: 'jl-3', entryId: 'je-2', type: 'DEBIT', amount: 4500 },
        { id: 'jl-4', entryId: 'je-2', type: 'CREDIT', amount: 4500 },
      ],
      stockBalances: [
        { productId: 'p1', locationId: 'loc1', onHand: 50 },
        { productId: 'p2', locationId: 'loc1', onHand: 120 },
        { productId: 'p3', locationId: 'loc1', onHand: 0 },
      ],
    },
  };

  it('DR-001 & DR-002: Successfully encrypts database snapshot using AES-256-GCM', () => {
    const plainJson = JSON.stringify(mockDatabaseDataset);
    const encryptedPkg = encryptBackupData(plainJson, testSecretKey, mockDatabaseDataset.counts);

    expect(encryptedPkg.format).toBe('GRABBER_BACKUP_V1');
    expect(encryptedPkg.algorithm).toBe('aes-256-gcm');
    expect(encryptedPkg.iv).toBeDefined();
    expect(encryptedPkg.authTag).toBeDefined();
    expect(encryptedPkg.ciphertext).toBeDefined();
    expect(encryptedPkg.checksum).toBeDefined();
    expect(encryptedPkg.ciphertext).not.toContain('ORD-1001'); // Ciphertext is encrypted
  });

  it('DR-003: Packages verified SHA-256 integrity checksum', () => {
    const plainJson = JSON.stringify(mockDatabaseDataset);
    const encryptedPkg = encryptBackupData(plainJson, testSecretKey, mockDatabaseDataset.counts);

    expect(encryptedPkg.checksum.length).toBe(64); // SHA-256 hex string
  });

  it('DR-004: Restores and decrypts cleanly with correct key, fails on wrong key or tampered tag', () => {
    const plainJson = JSON.stringify(mockDatabaseDataset);
    const encryptedPkg = encryptBackupData(plainJson, testSecretKey, mockDatabaseDataset.counts);

    // Decrypt with correct key
    const decryptedJson = decryptBackupData(encryptedPkg, testSecretKey);
    const restored = JSON.parse(decryptedJson);
    expect(restored.data.orders.length).toBe(2);
    expect(restored.data.orders[0].orderNumber).toBe('ORD-1001');

    // Decrypt with wrong key fails
    expect(() => decryptBackupData(encryptedPkg, 'wrong-encryption-key-fail')).toThrow();

    // Tampered authTag fails
    const tamperedPkg = { ...encryptedPkg, authTag: '00112233445566778899aabbccddeeff' };
    expect(() => decryptBackupData(tamperedPkg, testSecretKey)).toThrow();
  });

  it('DR-005: Restored DB integrity tests confirm balanced debits/credits and non-negative stock', () => {
    const integrityReport = verifyRestoredDatabaseIntegrity(mockDatabaseDataset.data);

    expect(integrityReport.valid).toBe(true);
    expect(integrityReport.checks.journalsBalance).toBe(true);
    expect(integrityReport.checks.noNegativeBalances).toBe(true);
    expect(integrityReport.errors.length).toBe(0);

    // Corrupt accounting dataset (imbalanced debits vs credits)
    const imbalancedDataset = {
      ...mockDatabaseDataset.data,
      journalLines: [
        { id: 'jl-1', type: 'DEBIT', amount: 15000 },
        { id: 'jl-2', type: 'CREDIT', amount: 10000 }, // Under-credited
      ],
    };
    const failedReport = verifyRestoredDatabaseIntegrity(imbalancedDataset);
    expect(failedReport.valid).toBe(false);
    expect(failedReport.checks.journalsBalance).toBe(false);
    expect(failedReport.errors[0]).toContain('Accounting imbalance');

    // Corrupt stock dataset (negative stock)
    const negativeStockDataset = {
      ...mockDatabaseDataset.data,
      stockBalances: [{ productId: 'p1', locationId: 'loc1', onHand: -5 }],
    };
    const failedStockReport = verifyRestoredDatabaseIntegrity(negativeStockDataset);
    expect(failedStockReport.valid).toBe(false);
    expect(failedStockReport.checks.noNegativeBalances).toBe(false);
  });

  it('DR-005b: orders-consistent check now actually inspects orderItems (previously always passed)', () => {
    // Order with no line items must fail — the check used to build the count map and discard it.
    const orphanedOrderDataset = {
      ...mockDatabaseDataset.data,
      orders: [{ id: 'ord-1', orderNumber: 'ORD-1001', orderStatus: 'COMPLETED' }],
      orderItems: [] as Array<{ id: string; orderId: string }>,
    };
    const emptyOrderReport = verifyRestoredDatabaseIntegrity(orphanedOrderDataset);
    expect(emptyOrderReport.valid).toBe(false);
    expect(emptyOrderReport.checks.ordersConsistent).toBe(false);
    expect(emptyOrderReport.errors.some((e) => e.includes('has no line items'))).toBe(true);

    // DRAFT/CANCELLED orders are legitimately empty and must not fail the check.
    const draftOrderDataset = {
      ...mockDatabaseDataset.data,
      orders: [{ id: 'ord-1', orderNumber: 'ORD-1001', orderStatus: 'DRAFT' }],
      orderItems: [] as Array<{ id: string; orderId: string }>,
    };
    expect(verifyRestoredDatabaseIntegrity(draftOrderDataset).checks.ordersConsistent).toBe(true);

    // An order item referencing a non-existent order must fail.
    const orphanedItemDataset = {
      ...mockDatabaseDataset.data,
      orders: [{ id: 'ord-1', orderNumber: 'ORD-1001', orderStatus: 'COMPLETED' }],
      orderItems: [{ id: 'oi-1', orderId: 'ord-missing' }],
    };
    const orphanedItemReport = verifyRestoredDatabaseIntegrity(orphanedItemDataset);
    expect(orphanedItemReport.valid).toBe(false);
    expect(orphanedItemReport.errors.some((e) => e.includes('references missing order'))).toBe(true);

    // A complete order with matching items must pass.
    const validOrderDataset = {
      ...mockDatabaseDataset.data,
      orders: [{ id: 'ord-1', orderNumber: 'ORD-1001', orderStatus: 'COMPLETED' }],
      orderItems: [{ id: 'oi-1', orderId: 'ord-1' }],
    };
    expect(verifyRestoredDatabaseIntegrity(validOrderDataset).checks.ordersConsistent).toBe(true);
  });

  it('DR-005c: stock ledger integrity now reconciles movement deltas against onHand balances (previously never falsified)', () => {
    const reconciledDataset = {
      ...mockDatabaseDataset.data,
      stockMovements: [
        { locationId: 'loc1', productId: 'p1', variantId: null, delta: 60 },
        { locationId: 'loc1', productId: 'p1', variantId: null, delta: -10 },
      ],
      stockBalances: [{ productId: 'p1', locationId: 'loc1', variantId: null, onHand: 50 }],
    };
    expect(verifyRestoredDatabaseIntegrity(reconciledDataset).checks.stockIntegrity).toBe(true);

    const mismatchedDataset = {
      ...mockDatabaseDataset.data,
      stockMovements: [{ locationId: 'loc1', productId: 'p1', variantId: null, delta: 60 }],
      stockBalances: [{ productId: 'p1', locationId: 'loc1', variantId: null, onHand: 50 }],
    };
    const mismatchedReport = verifyRestoredDatabaseIntegrity(mismatchedDataset);
    expect(mismatchedReport.valid).toBe(false);
    expect(mismatchedReport.checks.stockIntegrity).toBe(false);
    expect(mismatchedReport.errors.some((e) => e.includes('Stock ledger mismatch'))).toBe(true);
  });

  it('DR-006 & DR-007: Validates SLA commitment: RPO <= 1 hour, RTO <= 15 minutes', () => {
    expect(DISASTER_RECOVERY_SLA.RPO_HOURS).toBeLessThanOrEqual(1);
    expect(DISASTER_RECOVERY_SLA.RTO_MINUTES).toBeLessThanOrEqual(15);
    expect(DISASTER_RECOVERY_SLA.ENCRYPTION_STANDARD).toBe('AES-256-GCM');
  });
});
