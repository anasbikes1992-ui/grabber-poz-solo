import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { AttributionEngine } from '@/lib/analytics/attribution-engine';
import { marginFromRevenueAndCogs, sumLineCogs } from '@/lib/analytics/margin';
import { VERTICAL_PRESETS } from '@/lib/config/vertical-presets';
import { SALON_SERVICE_SKUS } from '@/lib/salon/service-catalog';

const root = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Wave A vertical depth', () => {
  it('VERT-C01 margin helpers use real unitCost', () => {
    const cogs = sumLineCogs([
      { unitCost: 100, quantity: 2 },
      { unitCost: 50, quantity: 1 },
    ]);
    expect(cogs).toBe(250);
    const m = marginFromRevenueAndCogs(1000, 250);
    expect(m.grossProfit).toBe(750);
    expect(m.grossMarginPct).toBe(75);
    const p = AttributionEngine.calculateOrderProfit(1000, [
      { unitCost: 100, quantity: 2 },
      { unitCost: 50, quantity: 1 },
    ]);
    expect(p.cogs).toBe(250);
    expect(read('src/app/api/jarvis/attribution/route.ts')).not.toContain('0.65');
    expect(read('src/app/api/reports/sales/route.ts')).toContain('monthGrossMarginPct');
  });

  it('VERT-R01 recipe cost module + API enrichment', () => {
    expect(fs.existsSync(path.join(root, 'src/lib/restaurant/recipe-cost.ts'))).toBe(true);
    expect(read('src/app/api/recipes/route.ts')).toContain('listRecipesWithCost');
    expect(read('src/app/restaurant/page.tsx')).toContain('foodCostPct');
  });

  it('VERT-R02 settle_kot wired', () => {
    expect(read('src/lib/restaurant/restaurant-service.ts')).toContain("action === 'settle_kot'");
    expect(read('src/components/restaurant/table-service-panel.tsx')).toContain('settle_kot');
    expect(read('src/components/restaurant/table-service-panel.tsx')).toContain('Settle & pay');
  });

  it('VERT-P01/S01 salon preset + catalog', () => {
    expect(VERTICAL_PRESETS.salon).toBeTruthy();
    expect(VERTICAL_PRESETS.salon.flags.appointments).toBe(true);
    expect(VERTICAL_PRESETS.salon.flags.restaurant).toBe(false);
    expect(SALON_SERVICE_SKUS.some((s) => s.sku === 'SALON-HAIRCUT')).toBe(true);
    expect(read('src/lib/setup/dynamic-seed.ts')).toContain('SALON-HAIRCUT');
  });

  it('VERT-S02 complete appointment charge path', () => {
    expect(fs.existsSync(path.join(root, 'src/lib/salon/complete-appointment.ts'))).toBe(true);
    expect(read('src/app/api/appointments/route.ts')).toContain('completeAppointmentAndCharge');
    expect(read('src/app/appointments/page.tsx')).toContain('Complete & charge');
  });
});
