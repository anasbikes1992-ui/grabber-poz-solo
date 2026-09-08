/**
 * GRABBER BUSINESS OS — EXPLAINABLE HEALTH SCORE ENGINE
 * Computes composite 0–100 Business Health and Growth Scores with full factor breakdowns.
 */

export interface HealthScoreBreakdown {
  compositeScore: number; // 0–100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  categoryScores: {
    salesRevenue: { score: number; weight: number; label: string };
    profitability: { score: number; weight: number; label: string };
    inventoryHealth: { score: number; weight: number; label: string };
    customerRetention: { score: number; weight: number; label: string };
    seoAndGrowth: { score: number; weight: number; label: string };
    operationsAndDebt: { score: number; weight: number; label: string };
  };
  positiveHighlights: string[];
  deductionsAndWarnings: string[];
}

export class HealthScoreEngine {
  public static calculateBusinessHealth(metrics: {
    revenueVsBaselinePercent: number; // e.g. +10% or -15%
    grossMarginPercent: number;        // e.g. 34%
    stockoutRiskCount: number;         // e.g. 2 SKUs
    deadStockValueLkr: number;         // e.g. 15,000 LKR
    repeatCustomerRate: number;        // e.g. 28%
    seoScore: number;                  // 0-100
    overdueCreditCount: number;        // e.g. 0
  }): HealthScoreBreakdown {
    const positives: string[] = [];
    const warnings: string[] = [];

    // 1. Sales Revenue (Weight: 25)
    let salesScore = 75;
    if (metrics.revenueVsBaselinePercent >= 15) {
      salesScore = 95;
      positives.push(`Sales revenue is up +${metrics.revenueVsBaselinePercent}% vs 7-day baseline.`);
    } else if (metrics.revenueVsBaselinePercent >= 0) {
      salesScore = 82;
    } else if (metrics.revenueVsBaselinePercent >= -15) {
      salesScore = 65;
      warnings.push(`Daily revenue dipped ${Math.abs(metrics.revenueVsBaselinePercent)}% vs normal volume.`);
    } else {
      salesScore = 40;
      warnings.push(`Severe sales contraction: ${Math.abs(metrics.revenueVsBaselinePercent)}% below baseline.`);
    }

    // 2. Profitability & Margins (Weight: 20)
    let profitScore = 70;
    if (metrics.grossMarginPercent >= 40) {
      profitScore = 95;
      positives.push(`Exceptional gross margin of ${metrics.grossMarginPercent.toFixed(1)}%.`);
    } else if (metrics.grossMarginPercent >= 28) {
      profitScore = 80;
    } else if (metrics.grossMarginPercent >= 18) {
      profitScore = 60;
      warnings.push(`Thin gross margin (${metrics.grossMarginPercent.toFixed(1)}%). Check supplier costs.`);
    } else {
      profitScore = 35;
      warnings.push(`Critical margin compression (${metrics.grossMarginPercent.toFixed(1)}%).`);
    }

    // 3. Inventory Health (Weight: 20)
    let invScore = 85;
    if (metrics.stockoutRiskCount === 0) {
      invScore = 95;
      positives.push('Zero imminent stockouts across active catalog.');
    } else if (metrics.stockoutRiskCount <= 3) {
      invScore = 75;
      warnings.push(`${metrics.stockoutRiskCount} product(s) at or below reorder level.`);
    } else {
      invScore = 50;
      warnings.push(`High stockout risk: ${metrics.stockoutRiskCount} products running low.`);
    }
    if (metrics.deadStockValueLkr > 50000) {
      invScore -= 15;
      warnings.push(`LKR ${metrics.deadStockValueLkr.toLocaleString()} tied up in dead/slow inventory.`);
    }

    // 4. Customer Retention (Weight: 15)
    let custScore = 70;
    if (metrics.repeatCustomerRate >= 35) {
      custScore = 92;
      positives.push(`Strong customer loyalty with ${metrics.repeatCustomerRate}% repeat buyer rate.`);
    } else if (metrics.repeatCustomerRate >= 20) {
      custScore = 78;
    } else {
      custScore = 55;
      warnings.push(`Low customer repeat rate (${metrics.repeatCustomerRate}%). Retarget dormant buyers.`);
    }

    // 5. SEO & Growth (Weight: 10)
    const seoScoreNorm = Math.min(100, Math.max(0, metrics.seoScore));
    if (seoScoreNorm >= 80) {
      positives.push(`Solid storefront SEO health score (${seoScoreNorm}/100).`);
    } else if (seoScoreNorm < 60) {
      warnings.push(`Storefront SEO score is ${seoScoreNorm}/100. Metadata and schema need attention.`);
    }

    // 6. Operations & Debt (Weight: 10)
    let opsScore = 90;
    if (metrics.overdueCreditCount > 0) {
      opsScore = Math.max(40, 90 - metrics.overdueCreditCount * 10);
      warnings.push(`${metrics.overdueCreditCount} overdue Polim Potha customer balance(s) requiring follow-up.`);
    }

    // Composite Calculation
    const weightedTotal =
      salesScore * 0.25 +
      profitScore * 0.2 +
      invScore * 0.2 +
      custScore * 0.15 +
      seoScoreNorm * 0.1 +
      opsScore * 0.1;

    const compositeScore = Math.round(weightedTotal);

    let grade: HealthScoreBreakdown['grade'] = 'B';
    if (compositeScore >= 92) grade = 'A+';
    else if (compositeScore >= 85) grade = 'A';
    else if (compositeScore >= 78) grade = 'B+';
    else if (compositeScore >= 70) grade = 'B';
    else if (compositeScore >= 60) grade = 'C';
    else if (compositeScore >= 50) grade = 'D';
    else grade = 'F';

    return {
      compositeScore,
      grade,
      categoryScores: {
        salesRevenue: { score: salesScore, weight: 25, label: 'Sales Revenue' },
        profitability: { score: profitScore, weight: 20, label: 'Profitability & Margin' },
        inventoryHealth: { score: invScore, weight: 20, label: 'Inventory Health' },
        customerRetention: { score: custScore, weight: 15, label: 'Customer Retention' },
        seoAndGrowth: { score: seoScoreNorm, weight: 10, label: 'SEO & Growth' },
        operationsAndDebt: { score: opsScore, weight: 10, label: 'Credit & Operations' },
      },
      positiveHighlights: positives,
      deductionsAndWarnings: warnings,
    };
  }
}
