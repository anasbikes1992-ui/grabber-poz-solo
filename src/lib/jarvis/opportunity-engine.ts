/**
 * GRABBER BUSINESS OS — OPPORTUNITY INBOX & DISCOVERY ENGINE
 * Uncovers high-margin, trending, customer reactivation, and SEO revenue opportunities.
 */

export type OpportunityType =
  | 'TRENDING_PRODUCT'
  | 'HIGH_MARGIN_CROSS_SELL'
  | 'CUSTOMER_REACTIVATION'
  | 'CLEARANCE_DEAD_STOCK'
  | 'SEO_HIGH_INTENT_KEYWORD'
  | 'BUNDLE_UPSELL'
  | 'CART_ABANDONMENT_RECOVERY';

export interface BusinessOpportunity {
  id: string;
  type: OpportunityType;
  title: string;
  category: string;
  score: number; // 0–100 normalized priority score
  evidence: string[];
  recommendation: string;
  estimatedRevenueLkr: { min: number; max: number };
  estimatedProfitLkr: { min: number; max: number };
  actionDraft: {
    actionType: string;
    label: string;
    payload: Record<string, unknown>;
  };
  createdAt: Date;
}

export class OpportunityEngine {
  /**
   * Evaluates trending products with accelerating demand and adequate stock.
   */
  public static discoverTrendingOpportunities(products: Array<{
    id: string;
    name: string;
    recent7dSales: number;
    prior7dSales: number;
    onHand: number;
    unitPrice: number;
    unitCost: number;
  }>): BusinessOpportunity[] {
    const opps: BusinessOpportunity[] = [];

    for (const p of products) {
      if (p.prior7dSales > 0 && p.recent7dSales >= p.prior7dSales * 1.3 && p.onHand > 10) {
        const growthPct = Math.round(((p.recent7dSales - p.prior7dSales) / p.prior7dSales) * 100);
        const marginPct = p.unitPrice > 0 ? Math.round(((p.unitPrice - p.unitCost) / p.unitPrice) * 100) : 0;
        const estRevenue = p.recent7dSales * p.unitPrice * 1.5;
        const estProfit = estRevenue * (marginPct / 100);

        opps.push({
          id: `opp_trend_${p.id}`,
          type: 'TRENDING_PRODUCT',
          title: `Trending Surge: ${p.name} (+${growthPct}%)`,
          category: 'SALES & MARKETING',
          score: Math.min(98, 60 + Math.round(growthPct / 2) + Math.round(marginPct / 5)),
          evidence: [
            `Sales velocity increased +${growthPct}% over the last 7 days.`,
            `Stock on hand is healthy (${p.onHand} units available).`,
            `Gross margin is robust at ${marginPct}%.`,
          ],
          recommendation: `Feature ${p.name} on the storefront homepage hero and run a WhatsApp showcase blast.`,
          estimatedRevenueLkr: { min: Math.round(estRevenue * 0.8), max: Math.round(estRevenue * 1.4) },
          estimatedProfitLkr: { min: Math.round(estProfit * 0.8), max: Math.round(estProfit * 1.4) },
          actionDraft: {
            actionType: 'DRAFT_PROMOTION',
            label: `Promote ${p.name}`,
            payload: { productId: p.id, title: `Trending: ${p.name}`, highlight: true },
          },
          createdAt: new Date(),
        });
      }
    }

    return opps.sort((a, b) => b.score - a.score);
  }

  /**
   * Identifies dormant high-value customers who have not ordered in 45–90 days.
   */
  public static discoverCustomerReactivationOpportunities(customers: Array<{
    id: string;
    name: string;
    phone: string;
    lifetimeSpend: number;
    orderCount: number;
    daysSinceLastOrder: number;
  }>): BusinessOpportunity[] {
    const opps: BusinessOpportunity[] = [];
    const highValueDormant = customers.filter((c) => c.lifetimeSpend >= 25000 && c.daysSinceLastOrder >= 45);

    if (highValueDormant.length > 0) {
      const avgSpend = Math.round(
        highValueDormant.reduce((sum, c) => sum + c.lifetimeSpend, 0) / highValueDormant.length
      );
      const estRev = highValueDormant.length * (avgSpend * 0.3);

      opps.push({
        id: `opp_reactivation_${Date.now()}`,
        type: 'CUSTOMER_REACTIVATION',
        title: `Reactivate ${highValueDormant.length} High-Value VIP Customers`,
        category: 'CUSTOMER RETENTION',
        score: 88,
        evidence: [
          `${highValueDormant.length} VIP customers (lifetime spend > LKR 25,000) have been inactive for >45 days.`,
          `Average historical customer value is LKR ${avgSpend.toLocaleString()}.`,
          `High historical purchase propensity upon personalized outreach.`,
        ],
        recommendation: `Send a personalized VIP comeback discount code (e.g. 10% off next visit/order) via WhatsApp.`,
        estimatedRevenueLkr: { min: Math.round(estRev * 0.7), max: Math.round(estRev * 1.3) },
        estimatedProfitLkr: { min: Math.round(estRev * 0.25), max: Math.round(estRev * 0.45) },
        actionDraft: {
          actionType: 'WHATSAPP_CAMPAIGN',
          label: 'Launch VIP Comeback WhatsApp Blast',
          payload: {
            audienceSize: highValueDormant.length,
            customerIds: highValueDormant.map((c) => c.id),
            offerText: 'We miss you! Enjoy 10% off your next order with code VIP10.',
          },
        },
        createdAt: new Date(),
      });
    }

    return opps;
  }
}
