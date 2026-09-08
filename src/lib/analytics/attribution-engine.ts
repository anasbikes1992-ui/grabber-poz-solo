/**
 * GRABBER BUSINESS OS — REVENUE & PROFIT ATTRIBUTION ENGINE
 * Links marketing campaigns and SEO traffic directly to realized orders, revenue, COGS, and gross profit.
 */

export interface AttributedOrder {
  orderId: string;
  orderNumber: string;
  channel: string;
  campaignId?: string;
  keyword?: string;
  customerId?: string;
  grandTotalLkr: number;
  totalCogsLkr: number;
  grossProfitLkr: number;
  grossMarginPercent: number;
  createdAt: Date;
}

export interface ChannelAttributionReport {
  channel: string;
  campaignId?: string;
  attributedOrdersCount: number;
  totalRevenueLkr: number;
  totalCogsLkr: number;
  totalGrossProfitLkr: number;
  blendedGrossMarginPercent: number;
  campaignCostLkr?: number;
  realizedRoas?: number;
  realizedRoiPercent?: number;
  topPerformingItems: Array<{ productId: string; name: string; unitsSold: number; revenueLkr: number }>;
}

export class AttributionEngine {
  public static calculateOrderProfit(
    grandTotal: number,
    items: Array<{ unitCost?: number; quantity: number }>
  ): { cogs: number; profit: number; marginPercent: number } {
    const totalCogs = items.reduce((sum, item) => sum + (Number(item.unitCost || 0) * Math.max(1, item.quantity)), 0);
    const profit = Math.max(0, grandTotal - totalCogs);
    const marginPercent = grandTotal > 0 ? Math.round((profit / grandTotal) * 1000) / 10 : 0;

    return {
      cogs: Math.round(totalCogs * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      marginPercent,
    };
  }

  public static generateChannelReport(
    channelName: string,
    orders: AttributedOrder[],
    campaignCost = 0
  ): ChannelAttributionReport {
    let totalRev = 0;
    let totalCogs = 0;
    let totalProfit = 0;

    for (const ord of orders) {
      totalRev += ord.grandTotalLkr;
      totalCogs += ord.totalCogsLkr;
      totalProfit += ord.grossProfitLkr;
    }

    const blendedMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 1000) / 10 : 0;
    const roas = campaignCost > 0 ? Math.round((totalRev / campaignCost) * 100) / 100 : undefined;
    const roi = campaignCost > 0 ? Math.round(((totalProfit - campaignCost) / campaignCost) * 1000) / 10 : undefined;

    return {
      channel: channelName,
      attributedOrdersCount: orders.length,
      totalRevenueLkr: Math.round(totalRev),
      totalCogsLkr: Math.round(totalCogs),
      totalGrossProfitLkr: Math.round(totalProfit),
      blendedGrossMarginPercent: blendedMargin,
      campaignCostLkr: campaignCost,
      realizedRoas: roas,
      realizedRoiPercent: roi,
      topPerformingItems: [],
    };
  }
}
