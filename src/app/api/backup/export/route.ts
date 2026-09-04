import { NextResponse } from 'next/server';
import { db, orders, orderItems, payments, journalEntries, journalLines, polimPothaAccounts, customers, products, stockBalances } from '@/db';
import { getSession } from '@/lib/auth/session';
import { encryptBackupData } from '@/lib/backup/crypto-backup';

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
      return new NextResponse(JSON.stringify(encryptedPkg, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="grabber-backup-encrypted-${Date.now()}.json"`,
        },
      });
    }

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="grabber-backup-${Date.now()}.json"`,
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({
      success: false,
      error: e.message,
      hint: 'Backup requires live DATABASE_URL',
    }, { status: 500 });
  }
}

