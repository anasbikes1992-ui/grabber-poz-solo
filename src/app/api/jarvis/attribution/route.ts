import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db, orders } from '@/db';
import { sql } from 'drizzle-orm';
import { AttributionEngine, type AttributedOrder } from '@/lib/analytics/attribution-engine';
import { requireStaffSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    await requireStaffSession();

    const orderRows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        channel: orders.channel,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(sql`${orders.orderStatus} != 'DRAFT' AND ${orders.orderStatus} != 'CANCELLED'`)
      .limit(100);

    const attributed: AttributedOrder[] = orderRows.map((o) => {
      const grandTotal = Number(o.grandTotal || 0);
      const estCogs = grandTotal * 0.65;
      const profit = grandTotal - estCogs;

      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        channel: o.channel || 'POS',
        grandTotalLkr: grandTotal,
        totalCogsLkr: estCogs,
        grossProfitLkr: profit,
        grossMarginPercent: 35.0,
        createdAt: o.createdAt || new Date(),
      };
    });

    const posReport = AttributionEngine.generateChannelReport('POS', attributed.filter((a) => a.channel === 'POS'));
    const storefrontReport = AttributionEngine.generateChannelReport('STOREFRONT', attributed.filter((a) => a.channel === 'STOREFRONT'), 5000);
    const whatsappReport = AttributionEngine.generateChannelReport('WHATSAPP', attributed.filter((a) => a.channel === 'WHATSAPP'), 1500);

    return NextResponse.json({
      success: true,
      channels: [posReport, storefrontReport, whatsappReport],
      summary: {
        totalOrders: attributed.length,
        totalRevenueLkr: attributed.reduce((s, a) => s + a.grandTotalLkr, 0),
        totalGrossProfitLkr: attributed.reduce((s, a) => s + a.grossProfitLkr, 0),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: (err as { status?: number }).status || 500 }
    );
  }
}
