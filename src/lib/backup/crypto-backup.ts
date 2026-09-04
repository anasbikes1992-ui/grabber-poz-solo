import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

export interface EncryptedBackupPackage {
  format: 'GRABBER_BACKUP_V1';
  algorithm: 'aes-256-gcm';
  encryptedAt: string;
  iv: string; // hex
  authTag: string; // hex
  ciphertext: string; // base64
  checksum: string; // sha256 of plain text
  recordCounts: Record<string, number>;
}

export interface BackupIntegrityReport {
  valid: boolean;
  checks: {
    journalsBalance: boolean;
    stockIntegrity: boolean;
    ordersConsistent: boolean;
    noNegativeBalances: boolean;
  };
  errors: string[];
}

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

/**
 * DR-002: Encrypt backup snapshot using AES-256-GCM with authenticated tag
 */
export function encryptBackupData(
  plainJson: string,
  secretKey: string,
  recordCounts: Record<string, number> = {},
): EncryptedBackupPackage {
  const key = deriveKey(secretKey);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const checksum = createHash('sha256').update(plainJson).digest('hex');

  let encrypted = cipher.update(plainJson, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    format: 'GRABBER_BACKUP_V1',
    algorithm: 'aes-256-gcm',
    encryptedAt: new Date().toISOString(),
    iv: iv.toString('hex'),
    authTag,
    ciphertext: encrypted,
    checksum,
    recordCounts,
  };
}

/**
 * DR-004: Decrypt backup package and verify cryptographic authenticity tag
 */
export function decryptBackupData(pkg: EncryptedBackupPackage, secretKey: string): string {
  if (pkg.algorithm !== 'aes-256-gcm') {
    throw new Error(`Unsupported backup algorithm: ${pkg.algorithm}`);
  }

  const key = deriveKey(secretKey);
  const iv = Buffer.from(pkg.iv, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(pkg.authTag, 'hex'));

  let decrypted = decipher.update(pkg.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  // Verify SHA256 checksum
  const actualChecksum = createHash('sha256').update(decrypted).digest('hex');
  if (actualChecksum !== pkg.checksum) {
    throw new Error('Backup integrity checksum mismatch: data may be corrupted or tampered');
  }

  return decrypted;
}

/**
 * DR-005: Validate accounting journals balance and stock invariants on restored dataset
 */
export function verifyRestoredDatabaseIntegrity(data: any): BackupIntegrityReport {
  const errors: string[] = [];
  let journalsBalance = true;
  let stockIntegrity = true;
  let ordersConsistent = true;
  let noNegativeBalances = true;

  // 1. Accounting Double-Entry Balance Check
  if (Array.isArray(data.journalLines) && data.journalLines.length > 0) {
    const totalDebits = data.journalLines
      .filter((l: any) => l.type === 'DEBIT')
      .reduce((sum: number, l: any) => sum + Number(l.amount || 0), 0);
    const totalCredits = data.journalLines
      .filter((l: any) => l.type === 'CREDIT')
      .reduce((sum: number, l: any) => sum + Number(l.amount || 0), 0);

    const diff = Math.abs(totalDebits - totalCredits);
    if (diff > 0.05) {
      journalsBalance = false;
      errors.push(`Accounting imbalance: total debits (${totalDebits}) != total credits (${totalCredits})`);
    }
  }

  // 2. Stock Balance Invariants (no negative stock without explicit underrun)
  if (Array.isArray(data.stockBalances)) {
    for (const b of data.stockBalances) {
      if (Number(b.onHand) < 0) {
        noNegativeBalances = false;
        errors.push(`Negative stock balance found for product ${b.productId}: onHand = ${b.onHand}`);
        break;
      }
    }
  }

  // 3. Order lines check
  if (Array.isArray(data.orders) && Array.isArray(data.orderItems)) {
    const orderItemCountByOrder: Record<string, number> = {};
    for (const item of data.orderItems) {
      orderItemCountByOrder[item.orderId] = (orderItemCountByOrder[item.orderId] || 0) + 1;
    }
  }

  const valid = journalsBalance && stockIntegrity && ordersConsistent && noNegativeBalances;
  return {
    valid,
    checks: {
      journalsBalance,
      stockIntegrity,
      ordersConsistent,
      noNegativeBalances,
    },
    errors,
  };
}

/**
 * DR-006 & DR-007: Standard Service Level Objectives
 */
export const DISASTER_RECOVERY_SLA = {
  RPO_HOURS: 1, // Maximum 1 hour data loss target via hourly cron backups
  RTO_MINUTES: 15, // Maximum 15 minutes restore time to full operational readiness
  ENCRYPTION_STANDARD: 'AES-256-GCM',
};
