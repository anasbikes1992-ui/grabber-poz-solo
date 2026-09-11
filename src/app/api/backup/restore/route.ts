import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { decryptBackupData, verifyRestoredDatabaseIntegrity, type EncryptedBackupPackage } from '@/lib/backup/crypto-backup';

export async function POST(req: Request) {
  try {
    // Unconditional — this route replays a full dataset into the database.
    // Never gate this behind NODE_ENV; a non-production boot must not open it.
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only business OWNER can perform disaster recovery restores' },
        { status: 403 },
      );
    }

    const body = await req.json();
    // Server-configured key only. A caller-supplied header must never be able
    // to choose its own decryption key, and the session-signing secret must
    // never double as a backup key.
    const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;

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
