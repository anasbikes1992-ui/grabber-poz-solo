import { describe, it, expect } from 'vitest';
import { HealthScoreEngine } from '@/lib/jarvis/health-score';
import { AnomalyDetector } from '@/lib/jarvis/anomaly-detector';
import { OpportunityEngine } from '@/lib/jarvis/opportunity-engine';
import { KpiEngine, MASTER_KPIS } from '@/lib/jarvis/kpi-engine';

describe('Jarvis Closed-Loop Business Brain & Intelligence', () => {
  it('computes transparent, explainable 0–100 Business Health Scores with positive and warning factors', () => {
    const health = HealthScoreEngine.calculateBusinessHealth({
      revenueVsBaselinePercent: 12,
      grossMarginPercent: 36.5,
      stockoutRiskCount: 0,
      deadStockValueLkr: 0,
      repeatCustomerRate: 38,
      seoScore: 88,
      overdueCreditCount: 0,
    });

    expect(health.compositeScore).toBeGreaterThanOrEqual(85);
    expect(health.grade).toMatch(/A/);
    expect(health.positiveHighlights.length).toBeGreaterThan(0);
    expect(health.categoryScores.profitability.score).toBeGreaterThanOrEqual(80);
  });

  it('detects inventory and sales anomalies with evidence and confidence ratings', () => {
    const stockAnomalies = AnomalyDetector.detectInventoryAnomalies([
      {
        productId: 'sku-01',
        productName: 'Organic Ceylon Tea',
        onHand: 4,
        reorderLevel: 10,
        dailyVelocity7d: 2.0,
        unitPrice: 1200,
      },
    ]);

    expect(stockAnomalies.length).toBe(1);
    expect(stockAnomalies[0].severity).toBe('HIGH');
    expect(stockAnomalies[0].confidencePercent).toBe(95);
    expect(stockAnomalies[0].recommendedAction.actionType).toBe('DRAFT_PO');
  });

  it('uncovers commercial opportunities from trending inventory surges', () => {
    const opps = OpportunityEngine.discoverTrendingOpportunities([
      {
        id: 'sku-02',
        name: 'Cashew Butter Spread',
        recent7dSales: 35,
        prior7dSales: 20,
        onHand: 50,
        unitPrice: 2200,
        unitCost: 1400,
      },
    ]);

    expect(opps.length).toBe(1);
    expect(opps[0].type).toBe('TRENDING_PRODUCT');
    expect(opps[0].score).toBeGreaterThan(70);
    expect(opps[0].actionDraft.actionType).toBe('DRAFT_PROMOTION');
  });

  it('evaluates KPI baselines and variances correctly', () => {
    const varUp = KpiEngine.calculateVariance(120000, 100000);
    expect(varUp).toBe(20);

    const varDown = KpiEngine.calculateVariance(80000, 100000);
    expect(varDown).toBe(-20);

    const formatted = KpiEngine.formatKpiValue(185000, 'LKR');
    expect(formatted).toContain('LKR 185,000');
  });
});
