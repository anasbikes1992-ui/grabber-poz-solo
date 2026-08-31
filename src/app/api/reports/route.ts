import { NextResponse } from 'next/server';
import { sql, desc } from 'drizzle-orm';
import { db, orders, stockBalances, polimPothaAccounts } from '@/db';
import { getSession } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'summary';

    if (type === 'sales-by-channel') {
      const rows = await db.execute(sql`
        SELECT channel, COUNT(*)::int AS orders, COALESCE(SUM(grand_total), 0)::numeric AS revenue
        FROM orders
        GROUP BY channel
        ORDER BY revenue DESC
      `);
      return NextResponse.json({ success: true, type, rows: (rows as unknown as { rows?: unknown }).rows ?? rows });
    }

    if (type === 'stock-valuation') {
      const rows = await db.execute(sql`
        SELECT COALESCE(SUM(sb.on_hand * p.cost_price), 0)::numeric AS inventory_value,
               COALESCE(SUM(sb.on_hand), 0)::int AS units
        FROM stock_balances sb
        JOIN products p ON p.id = sb.product_id
      `);
      return NextResponse.json({ success: true, type, rows: (rows as unknown as { rows?: unknown }).rows ?? rows });
    }

    if (type === 'ar-aging') {
      const accounts = await db.select().from(polimPothaAccounts).orderBy(desc(polimPothaAccounts.currentBalance)).limit(100);
      return NextResponse.json({
        success: true,
        type,
        rows: accounts.map((a) => ({
          customerId: a.customerId,
          balance: a.currentBalance,
          status: a.status,
          bucket: Number(a.currentBalance) > 0 ? 'CURRENT_OR_UNKNOWN' : 'ZERO',
          note: 'Due-date aging requires entry due_date rollup — Wave 5 enhancement',
        })),
      });
    }

    if (type === 'trial-balance') {
      const rows = await db.execute(sql`
        SELECT coa.code, coa.name, coa.type,
               COALESCE(SUM(jl.debit), 0)::numeric AS debit,
               COALESCE(SUM(jl.credit), 0)::numeric AS credit
        FROM chart_of_accounts coa
        LEFT JOIN journal_lines jl ON jl.account_id = coa.id
        GROUP BY coa.id
        ORDER BY coa.code
      `);
      return NextResponse.json({ success: true, type, rows: (rows as unknown as { rows?: unknown }).rows ?? rows });
    }

    if (type === 'vat-worksheet') {
      const rows = await db.execute(sql`
        SELECT coa.code, coa.name,
               COALESCE(SUM(jl.debit), 0)::numeric AS debit,
               COALESCE(SUM(jl.credit), 0)::numeric AS credit
        FROM chart_of_accounts coa
        LEFT JOIN journal_lines jl ON jl.account_id = coa.id
        WHERE coa.code IN ('2100', '4000', '5000')
        GROUP BY coa.id
        ORDER BY coa.code
      `);
      return NextResponse.json({
        success: true,
        type,
        rows: (rows as unknown as { rows?: unknown }).rows ?? rows,
        note: 'VAT payable (2100) worksheet from posted journal lines — not a filed return',
      });
    }

    if (type === 'period-close-check') {
      const openShifts = await db.execute(sql`SELECT COUNT(*)::int AS c FROM shifts WHERE status = 'OPEN'`);
      const draftOrders = await db.execute(sql`SELECT COUNT(*)::int AS c FROM orders WHERE order_status = 'DRAFT'`);
      return NextResponse.json({
        success: true,
        type,
        blockers: {
          openShifts: (openShifts as unknown as { rows?: Array<{ c: number }> }).rows?.[0]?.c ?? openShifts,
          draftOrders: (draftOrders as unknown as { rows?: Array<{ c: number }> }).rows?.[0]?.c ?? draftOrders,
        },
        note: 'Close open shifts and resolve drafts before period close. Full lock API deferred.',
      });
    }

    // summary
    const [orderCount] = await db.select({ c: sql<number>`count(*)::int` }).from(orders);
    const [stockRows] = await db.select({ c: sql<number>`count(*)::int` }).from(stockBalances);
    return NextResponse.json({
      success: true,
      type: 'summary',
      orders: orderCount?.c ?? 0,
      stockBalanceRows: stockRows?.c ?? 0,
      reports: ['sales-by-channel', 'stock-valuation', 'ar-aging', 'trial-balance', 'vat-worksheet', 'period-close-check'],
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({
      success: false,
      error: e.message,
      hint: 'Requires live DATABASE_URL',
    }, { status: 500 });
  }
}
