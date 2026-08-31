import { NextResponse } from 'next/server';
import { db, orders, orderItems, payments, journalEntries, journalLines, polimPothaAccounts, customers, products, stockBalances } from '@/db';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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

    const payload = {
      exportedAt: new Date().toISOString(),
      source: 'postgres',
      counts: {
        orders: orderRows.length,
        orderItems: itemRows.length,
        payments: paymentRows.length,
        journalEntries: jeRows.length,
        journalLines: jlRows.length,
        polimAccounts: polimRows.length,
        customers: customerRows.length,
        products: productRows.length,
        stockBalances: stockRows.length,
      },
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
      hint: 'Backup requires live DATABASE_URL — in-memory export removed',
    }, { status: 500 });
  }
}
