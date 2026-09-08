/**
 * GRABBER BUSINESS OS — ANOMALY DETECTION ENGINE
 * Proactively identifies statistically significant shifts, spikes, and drop-offs across sales, stock, and operations.
 */

export type AnomalySeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BusinessAnomaly {
  id: string;
  category: 'SALES' | 'INVENTORY' | 'PAYMENT' | 'CUSTOMER' | 'STOREFRONT' | 'SECURITY';
  severity: AnomalySeverity;
  title: string;
  description: string;
  evidence: {
    metric: string;
    currentValue: number | string;
    expectedBaseline: number | string;
    deviationPercent?: number;
    samplePeriod: string;
  };
  confidencePercent: number; // 0–100
  estimatedImpactLkr?: number;
  recommendedAction: {
    actionType: string;
    label: string;
    payload?: Record<string, unknown>;
  };
  detectedAt: Date;
}

export interface MetricSample {
  current: number;
  baseline7d: number;
  baseline30d: number;
  label: string;
}

export class AnomalyDetector {
  /**
   * Evaluates sales velocity drops and sudden spikes.
   */
  public static detectSalesAnomalies(samples: {
    todayRevenue: number;
    avgDailyRevenue7d: number;
    todayOrders: number;
    avgDailyOrders7d: number;
    cancelledOrdersCount: number;
  }): BusinessAnomaly[] {
    const anomalies: BusinessAnomaly[] = [];

    // 1. Critical revenue drop (>40% below 7d average with significant volume)
    if (samples.avgDailyRevenue7d > 10000 && samples.todayRevenue < samples.avgDailyRevenue7d * 0.5) {
      const dropPct = Math.round(((samples.avgDailyRevenue7d - samples.todayRevenue) / samples.avgDailyRevenue7d) * 100);
      anomalies.push({
        id: `anom_sales_drop_${Date.now()}`,
        category: 'SALES',
        severity: dropPct > 60 ? 'CRITICAL' : 'HIGH',
        title: `Sales Revenue Down ${dropPct}% vs 7-Day Average`,
        description: `Current daily sales of LKR ${samples.todayRevenue.toLocaleString()} are significantly below the rolling baseline of LKR ${samples.avgDailyRevenue7d.toLocaleString()}.`,
        evidence: {
          metric: 'Daily Revenue',
          currentValue: `LKR ${samples.todayRevenue.toLocaleString()}`,
          expectedBaseline: `LKR ${samples.avgDailyRevenue7d.toLocaleString()}`,
          deviationPercent: -dropPct,
          samplePeriod: 'Last 7 Days',
        },
        confidencePercent: 92,
        estimatedImpactLkr: samples.avgDailyRevenue7d - samples.todayRevenue,
        recommendedAction: {
          actionType: 'PROMOTION_SUGGESTION',
          label: 'Deploy Flash Clearance / Hero Promo',
          payload: { discountPercent: 10, channel: 'WHATSAPP' },
        },
        detectedAt: new Date(),
      });
    }

    // 2. High cancellation rate anomaly
    if (samples.todayOrders > 5 && samples.cancelledOrdersCount / samples.todayOrders > 0.25) {
      const cancelRate = Math.round((samples.cancelledOrdersCount / samples.todayOrders) * 100);
      anomalies.push({
        id: `anom_order_cancel_${Date.now()}`,
        category: 'SALES',
        severity: 'HIGH',
        title: `Elevated Order Cancellation Rate (${cancelRate}%)`,
        description: `${samples.cancelledOrdersCount} orders have been cancelled today. Investigate delivery delays or payment gateway failures.`,
        evidence: {
          metric: 'Cancellation Rate',
          currentValue: `${cancelRate}%`,
          expectedBaseline: '< 5%',
          deviationPercent: cancelRate,
          samplePeriod: 'Today',
        },
        confidencePercent: 88,
        recommendedAction: {
          actionType: 'INSPECT_ORDERS',
          label: 'View Cancelled Orders & Logs',
        },
        detectedAt: new Date(),
      });
    }

    return anomalies;
  }

  /**
   * Evaluates inventory stockouts, sudden shrinkage, and dead stock risks.
   */
  public static detectInventoryAnomalies(items: Array<{
    productId: string;
    productName: string;
    onHand: number;
    reorderLevel: number;
    dailyVelocity7d: number;
    unitPrice: number;
  }>): BusinessAnomaly[] {
    const anomalies: BusinessAnomaly[] = [];

    for (const item of items) {
      // 1. Imminent Stockout (will run out within 3 days at current velocity)
      if (item.dailyVelocity7d > 0 && item.onHand <= item.dailyVelocity7d * 3) {
        const daysLeft = Math.max(0, Math.round((item.onHand / item.dailyVelocity7d) * 10) / 10);
        anomalies.push({
          id: `anom_stockout_${item.productId}`,
          category: 'INVENTORY',
          severity: daysLeft <= 1 ? 'CRITICAL' : 'HIGH',
          title: `Imminent Stockout: ${item.productName}`,
          description: `Stock on hand (${item.onHand} units) will deplete in ~${daysLeft} days based on current sales velocity (${item.dailyVelocity7d.toFixed(1)} units/day).`,
          evidence: {
            metric: 'Days of Stock',
            currentValue: `${daysLeft} days`,
            expectedBaseline: '> 14 days',
            samplePeriod: '7-day velocity',
          },
          confidencePercent: 95,
          estimatedImpactLkr: item.dailyVelocity7d * item.unitPrice * 7,
          recommendedAction: {
            actionType: 'DRAFT_PO',
            label: `Draft Restock PO for ${item.productName}`,
            payload: { productId: item.productId, recommendedQty: Math.ceil(item.dailyVelocity7d * 14) },
          },
          detectedAt: new Date(),
        });
      }
    }

    return anomalies;
  }
}
