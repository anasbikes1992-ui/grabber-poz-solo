import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db, orders, orderItems } from '@/db';
import { inArray, sql } from 'drizzle-orm';
import { AttributionEngine, type AttributedOrder } from '@/lib/analytics/attribution-engine';
import { requireStaffSession } from '@/lib/auth/session';
import { sumSpendForChannel } from '@/lib/marketing/spend-ledger';

export async function GET(_req: NextRequest) {
  try {
    await requireStaffSession();

    const orderRows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        channel: orders.channel,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
        campaignId: orders.campaignId,
      })
      .from(orders)
      .where(sql`${orders.orderStatus} != 'DRAFT' AND ${orders.orderStatus} != 'CANCELLED'`)
      .limit(100);

    const ids = orderRows.map((o) => o.id);
    const lines =
      ids.length > 0
        ? await db
            .select({
              orderId: orderItems.orderId,
              unitCost: orderItems.unitCost,
              quantity: orderItems.quantity,
            })
            .from(orderItems)
            .where(inArray(orderItems.orderId, ids))
        : [];

    const linesByOrder = new Map<string, Array<{ unitCost: number; quantity: number }>>();
    for (const line of lines) {
      const list = linesByOrder.get(line.orderId) || [];
      list.push({ unitCost: Number(line.unitCost || 0), quantity: line.quantity });
      linesByOrder.set(line.orderId, list);
    }

    const attributed: AttributedOrder[] = orderRows.map((o) => {
      const grandTotal = Number(o.grandTotal || 0);
      const profit = AttributionEngine.calculateOrderProfit(grandTotal, linesByOrder.get(o.id) || []);

      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        channel: o.channel || 'POS',
        campaignId: o.campaignId || undefined,
        grandTotalLkr: grandTotal,
        totalCogsLkr: profit.cogs,
        grossProfitLkr: profit.profit,
        grossMarginPercent: profit.marginPercent,
        createdAt: o.createdAt || new Date(),
      };
    });

    const storefrontSpend = await sumSpendForChannel('META').catch(() => 0);
    const googleSpend = await sumSpendForChannel('GOOGLE').catch(() => 0);
    const waSpend = await sumSpendForChannel('WHATSAPP').catch(() => 0);
    const storefrontCost = storefrontSpend + googleSpend;

    const posReport = AttributionEngine.generateChannelReport(
      'POS',
      attributed.filter((a) => a.channel === 'POS'),
    );
    const storefrontReport = AttributionEngine.generateChannelReport(
      'STOREFRONT',
      attributed.filter((a) => a.channel === 'STOREFRONT'),
      storefrontCost,
    );
    const whatsappReport = AttributionEngine.generateChannelReport(
      'WHATSAPP',
      attributed.filter((a) => a.channel === 'WHATSAPP'),
      waSpend,
    );

    return NextResponse.json({
      success: true,
      channels: [posReport, storefrontReport, whatsappReport],
      spend: { META: storefrontSpend, GOOGLE: googleSpend, WHATSAPP: waSpend },
      summary: {
        totalOrders: attributed.length,
        totalRevenueLkr: attributed.reduce((s, a) => s + a.grandTotalLkr, 0),
        totalCogsLkr: attributed.reduce((s, a) => s + a.totalCogsLkr, 0),
        totalGrossProfitLkr: attributed.reduce((s, a) => s + a.grossProfitLkr, 0),
        totalSpendLkr: storefrontCost + waSpend,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: (err as { status?: number }).status || 500 },
    );
  }
}
