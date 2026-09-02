import { NextResponse } from 'next/server';
import { desc, gte, lte, and } from 'drizzle-orm';
import { db, orders } from '@/db';
import {
  aggregateMonthlyTaxLiability,
  calculateMultiTaxLine,
  exportTaxCsv,
  type OrderTaxRow,
} from '@/lib/reports/tax-liability';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const format = searchParams.get('format');

    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const orderRows = await db
      .select()
      .from(orders)
      .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)))
      .orderBy(desc(orders.createdAt))
      .limit(5000);

    const taxRows: OrderTaxRow[] = orderRows.map((o) => {
      const net = Number(o.subtotal) - Number(o.discountTotal);
      const vat = Number(o.taxTotal);
      const sscl = Math.round(net * 0.025 * 100) / 100;
      return {
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        netSales: net,
        vatAmount: vat,
        ssclAmount: sscl,
        exemptAmount: vat === 0 ? net : 0,
      };
    });

    const summary = aggregateMonthlyTaxLiability(taxRows, month);

    if (format === 'csv') {
      return new NextResponse(exportTaxCsv(summary), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="tax-liability-${month}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      month,
      summary,
      sampleCalculation: calculateMultiTaxLine({ netAmount: 1000, taxProfileId: 'STANDARD_VAT' }),
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
