import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db, orders, orderItems, payments, journalEntries, journalLines, polimPothaAccounts, customers, products, stockBalances, backupRecords } from '@/db';
import { getSession } from '@/lib/auth/session';
import { encryptBackupData } from '@/lib/backup/crypto-backup';

async function recordBackupExport(input: { fileName: string; sizeBytes: number; checksum: string; encrypted: boolean }) {
  try {
    await db.insert(backupRecords).values({
      backupType: input.encrypted ? 'FULL_ENCRYPTED_EXPORT' : 'FULL_EXPORT',
      fileUrl: input.fileName,
      sizeBytes: input.sizeBytes,
      checksum: input.checksum,
    });
  } catch (err) {
    console.error('Backup export record insert failed', err);
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const encrypt = searchParams.get('encrypt') === 'true';
    const encryptionKey = req.headers.get('x-backup-key') || process.env.BACKUP_ENCRYPTION_KEY || process.env.AUTH_SECRET;

    const [
      orderRows,
      itemRows,
      paymentRows,
      jeRows,
      jlRows,
      polimRows,
      customerRows,
      productRows,
      stockRows,
    ] = await Promise.all([
      db.select().from(orders).limit(5000),
      db.select().from(orderItems).limit(20000),
      db.select().from(payments).limit(5000),
      db.select().from(journalEntries).limit(5000),
      db.select().from(journalLines).limit(20000),
      db.select().from(polimPothaAccounts).limit(5000),
      db.select().from(customers).limit(5000),
      db.select().from(products).limit(10000),
      db.select().from(stockBalances).limit(20000),
    ]);

    const counts = {
      orders: orderRows.length,
      orderItems: itemRows.length,
      payments: paymentRows.length,
      journalEntries: jeRows.length,
      journalLines: jlRows.length,
      polimAccounts: polimRows.length,
      customers: customerRows.length,
      products: productRows.length,
      stockBalances: stockRows.length,
    };

    const payload = {
      exportedAt: new Date().toISOString(),
      source: 'postgres',
      counts,
      data: {
        orders: orderRows,
        orderItems: itemRows,
        payments: paymentRows,
        journalEntries: jeRows,
        journalLines: jlRows,
        polimPothaAccounts: polimRows,
        customers: customerRows,
        products: productRows,
        stockBalances: stockRows,
      },
    };

    if (encrypt) {
      if (!encryptionKey) {
        return NextResponse.json(
          { success: false, error: 'Encryption key required for encrypted backup' },
          { status: 400 },
        );
      }
      const encryptedPkg = encryptBackupData(JSON.stringify(payload), encryptionKey, counts);
      const body = JSON.stringify(encryptedPkg, null, 2);
      const fileName = `grabber-backup-encrypted-${Date.now()}.json`;
      await recordBackupExport({
        fileName,
        sizeBytes: Buffer.byteLength(body),
        checksum: encryptedPkg.checksum || createHash('sha256').update(body).digest('hex'),
        encrypted: true,
      });
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }

    const body = JSON.stringify(payload, null, 2);
    const fileName = `grabber-backup-${Date.now()}.json`;
    await recordBackupExport({
      fileName,
      sizeBytes: Buffer.byteLength(body),
      checksum: createHash('sha256').update(body).digest('hex'),
      encrypted: false,
    });
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({
      success: false,
      error: 'Request failed',
      hint: 'Backup requires live DATABASE_URL',
    }, { status: 500 });
  }
}
