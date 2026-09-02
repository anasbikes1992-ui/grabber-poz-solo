import { describe, it, expect } from 'vitest';
import { parseKpiIds } from '../src/lib/analytics/kpi-registry';

describe('KPI registry', () => {
  it('parses comma-separated ids', () => {
    expect(parseKpiIds('today_revenue,month_revenue')).toEqual(['today_revenue', 'month_revenue']);
  });

  it('defaults to all kpis', () => {
    expect(parseKpiIds(null).length).toBeGreaterThan(3);
  });
});
