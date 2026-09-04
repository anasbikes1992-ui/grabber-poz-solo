import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { decryptBackupData, verifyRestoredDatabaseIntegrity, type EncryptedBackupPackage } from '@/lib/backup/crypto-backup';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      if (!session || session.role !== 'OWNER') {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only business OWNER can perform disaster recovery restores' },
          { status: 403 },
        );
      }
    }

    const body = await req.json();
    const encryptionKey = req.headers.get('x-backup-key') || process.env.BACKUP_ENCRYPTION_KEY || process.env.AUTH_SECRET;

    let payload: any;
    if (body.format === 'GRABBER_BACKUP_V1' && body.algorithm === 'aes-256-gcm') {
      if (!encryptionKey) {
        return NextResponse.json(
          { success: false, error: 'Encryption key required to decrypt backup' },
          { status: 400 },
        );
      }
      try {
        const decryptedJson = decryptBackupData(body as EncryptedBackupPackage, encryptionKey);
        payload = JSON.parse(decryptedJson);
      } catch (err: any) {
        return NextResponse.json(
          { success: false, error: `Decryption failed: ${err.message}` },
          { status: 400 },
        );
      }
    } else {
      payload = body;
    }

    if (!payload || !payload.data) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup package: missing data payload' },
        { status: 400 },
      );
    }

    // DR-005: Verify integrity of dataset before applying
    const integrity = verifyRestoredDatabaseIntegrity(payload.data);
    if (!integrity.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Restored backup failed integrity verification checks',
          integrityErrors: integrity.errors,
          checks: integrity.checks,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      code: 'DR_RESTORE_VERIFIED',
      restoredRecords: payload.counts || {},
      integrityChecks: integrity.checks,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
