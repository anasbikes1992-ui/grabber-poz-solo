/**
 * GRABBER BUSINESS OS — MASTER KPI ENGINE
 * Authoritative business formulas, baseline metrics, variance calculations, and target tracking.
 */

export interface KpiDefinition {
  id: string;
  name: string;
  category: 'SALES' | 'INVENTORY' | 'CUSTOMER' | 'FINANCE' | 'MARKETING' | 'SEO' | 'OPERATIONS';
  description: string;
  formula: string;
  unit: 'LKR' | 'PERCENT' | 'COUNT' | 'DAYS' | 'RATIO' | 'SCORE';
  target?: number;
  benchmarkGood?: number;
  benchmarkWarning?: number;
}

export interface KpiValue {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentValue: number;
  target?: number;
  historical7dAvg?: number;
  historical30dAvg?: number;
  varianceVs7dPercent?: number;
  varianceVsTargetPercent?: number;
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL';
  trend: 'UP' | 'DOWN' | 'FLAT';
}

export const MASTER_KPIS: Record<string, KpiDefinition> = {
  // 1. Sales KPIs
  TOTAL_REVENUE: {
    id: 'TOTAL_REVENUE',
    name: 'Total Gross Revenue',
    category: 'SALES',
    description: 'Sum of all completed orders across POS, Storefront, and WhatsApp.',
    formula: 'Sum(Orders.grandTotal)',
    unit: 'LKR',
  },
  AVERAGE_ORDER_VALUE: {
    id: 'AVERAGE_ORDER_VALUE',
    name: 'Average Order Value (AOV)',
    category: 'SALES',
    description: 'Average revenue generated per completed transaction.',
    formula: 'Total Revenue / Total Completed Orders',
    unit: 'LKR',
    benchmarkGood: 2500,
    benchmarkWarning: 1500,
  },
  UNITS_PER_TRANSACTION: {
    id: 'UNITS_PER_TRANSACTION',
    name: 'Units Per Transaction (UPT)',
    category: 'SALES',
    description: 'Average quantity of line items purchased per order.',
    formula: 'Total Units Sold / Total Orders',
    unit: 'RATIO',
    benchmarkGood: 2.5,
    benchmarkWarning: 1.2,
  },

  // 2. Finance & Profitability KPIs
  GROSS_MARGIN: {
    id: 'GROSS_MARGIN',
    name: 'Gross Profit Margin',
    category: 'FINANCE',
    description: 'Percentage of revenue remaining after subtracting Cost of Goods Sold (COGS).',
    formula: '((Revenue - COGS) / Revenue) * 100',
    unit: 'PERCENT',
    benchmarkGood: 35,
    benchmarkWarning: 20,
  },
  TOTAL_GROSS_PROFIT: {
    id: 'TOTAL_GROSS_PROFIT',
    name: 'Total Gross Profit',
    category: 'FINANCE',
    description: 'Net profit generated across all product sales.',
    formula: 'Revenue - COGS',
    unit: 'LKR',
  },
  CREDIT_OUTSTANDING_TOTAL: {
    id: 'CREDIT_OUTSTANDING_TOTAL',
    name: 'Polim Potha Credit Outstanding',
    category: 'FINANCE',
    description: 'Total active customer debt ledger balance.',
    formula: 'Sum(CustomerCreditBalances)',
    unit: 'LKR',
  },

  // 3. Inventory KPIs
  DAYS_OF_INVENTORY: {
    id: 'DAYS_OF_INVENTORY',
    name: 'Days of Inventory Remaining (DSI)',
    category: 'INVENTORY',
    description: 'Estimated days until current stock is depleted based on average daily sales.',
    formula: 'Available Stock / Average Daily Sales',
    unit: 'DAYS',
    benchmarkGood: 30,
    benchmarkWarning: 10,
  },
  STOCK_TURNOVER_RATIO: {
    id: 'STOCK_TURNOVER_RATIO',
    name: 'Inventory Turnover Ratio',
    category: 'INVENTORY',
    description: 'Speed at which entire inventory is sold and replaced over 30 days.',
    formula: 'COGS (30d) / Average Inventory Valuation',
    unit: 'RATIO',
    benchmarkGood: 4.0,
    benchmarkWarning: 1.5,
  },
  STOCKOUT_RISK_COUNT: {
    id: 'STOCKOUT_RISK_COUNT',
    name: 'SKUs at Risk of Stockout',
    category: 'INVENTORY',
    description: 'Number of active products at or below their assigned reorder level.',
    formula: 'Count(Products where onHand <= reorderLevel)',
    unit: 'COUNT',
    benchmarkGood: 0,
    benchmarkWarning: 5,
  },
  DEAD_STOCK_VALUATION: {
    id: 'DEAD_STOCK_VALUATION',
    name: 'Dead Stock Valuation',
    category: 'INVENTORY',
    description: 'Total capital tied up in products with zero sales in the last 45 days.',
    formula: 'Sum(StockQty * UnitCost for products with 0 sales in 45d)',
    unit: 'LKR',
  },

  // 4. Customer & Growth KPIs
  CUSTOMER_REPEAT_RATE: {
    id: 'CUSTOMER_REPEAT_RATE',
    name: 'Customer Repeat Purchase Rate',
    category: 'CUSTOMER',
    description: 'Percentage of buyers who have completed more than 1 order.',
    formula: '(Returning Customers / Total Unique Customers) * 100',
    unit: 'PERCENT',
    benchmarkGood: 30,
    benchmarkWarning: 15,
  },
  CUSTOMER_LIFETIME_VALUE: {
    id: 'CUSTOMER_LIFETIME_VALUE',
    name: 'Customer Lifetime Value (LTV)',
    category: 'CUSTOMER',
    description: 'Average total spend per registered customer over their lifetime.',
    formula: 'Total Historical Revenue / Total Customers',
    unit: 'LKR',
  },
  CHURN_RISK_CUSTOMERS: {
    id: 'CHURN_RISK_CUSTOMERS',
    name: 'At-Risk / Dormant Customers',
    category: 'CUSTOMER',
    description: 'High-value customers with no purchase in the last 60 days.',
    formula: 'Count(Customers with spend > avg and lastOrder > 60d)',
    unit: 'COUNT',
  },

  // 5. Storefront & Marketing KPIs
  STOREFRONT_CONVERSION_RATE: {
    id: 'STOREFRONT_CONVERSION_RATE',
    name: 'Storefront Checkout Conversion',
    category: 'MARKETING',
    description: 'Percentage of cart additions that completed checkout.',
    formula: '(Completed Orders / Add to Cart Events) * 100',
    unit: 'PERCENT',
    benchmarkGood: 3.5,
    benchmarkWarning: 1.5,
  },
  MARKETING_ROAS: {
    id: 'MARKETING_ROAS',
    name: 'Return on Ad / Campaign Spend (ROAS)',
    category: 'MARKETING',
    description: 'Gross revenue generated per rupee of promotional expense.',
    formula: 'Attributed Campaign Revenue / Campaign Cost',
    unit: 'RATIO',
    benchmarkGood: 4.0,
    benchmarkWarning: 2.0,
  },

  // 6. SEO KPIs
  SEO_HEALTH_SCORE: {
    id: 'SEO_HEALTH_SCORE',
    name: 'Storefront SEO Health Score',
    category: 'SEO',
    description: 'Composite rating of metadata completeness, schema tags, and crawlability.',
    formula: 'Calculated by Jarvis SEO Auditor',
    unit: 'SCORE',
    benchmarkGood: 85,
    benchmarkWarning: 60,
  },
};

export class KpiEngine {
  public static calculateVariance(current: number, baseline: number): number {
    if (baseline === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - baseline) / baseline) * 1000) / 10;
  }

  public static evaluateStatus(
    def: KpiDefinition,
    currentValue: number,
    varianceVs7d?: number
  ): { status: KpiValue['status']; trend: KpiValue['trend'] } {
    let status: KpiValue['status'] = 'GOOD';
    let trend: KpiValue['trend'] = 'FLAT';

    if (varianceVs7d != null) {
      if (varianceVs7d > 2) trend = 'UP';
      else if (varianceVs7d < -2) trend = 'DOWN';
    }

    if (def.id === 'STOCKOUT_RISK_COUNT') {
      if (currentValue === 0) status = 'EXCELLENT';
      else if (currentValue <= 3) status = 'GOOD';
      else if (currentValue <= 8) status = 'NEEDS_ATTENTION';
      else status = 'CRITICAL';
      return { status, trend };
    }

    if (def.benchmarkGood != null && def.benchmarkWarning != null) {
      if (currentValue >= def.benchmarkGood) status = 'EXCELLENT';
      else if (currentValue >= def.benchmarkWarning) status = 'GOOD';
      else status = 'NEEDS_ATTENTION';
    }

    return { status, trend };
  }

  public static formatKpiValue(val: number, unit: KpiDefinition['unit']): string {
    switch (unit) {
      case 'LKR':
        return `LKR ${val.toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
      case 'PERCENT':
        return `${val.toFixed(1)}%`;
      case 'DAYS':
        return `${val.toFixed(1)} days`;
      case 'RATIO':
        return `${val.toFixed(2)}x`;
      case 'SCORE':
        return `${Math.round(val)}/100`;
      case 'COUNT':
      default:
        return val.toLocaleString();
    }
  }
}
