import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseEngines, costModelForVertical } from '@/lib/config/cost-engines';
import { lineUnitPriceWithModifiers, normalizeKotItems } from '@/lib/restaurant/modifiers';
import { computeCommissionAmount, resolveCommissionPct } from '@/lib/salon/commission';
import { ALL_PRODUCT_ITEM_TYPES } from '@/lib/config/product-item-types';

const root = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Wave B vertical depth', () => {
  it('VERT-R03 kitchen waste module + restaurant action', () => {
    expect(fs.existsSync(path.join(root, 'src/lib/restaurant/kitchen-waste.ts'))).toBe(true);
    expect(read('src/lib/restaurant/restaurant-service.ts')).toContain("action === 'kitchen_waste'");
    expect(read('src/app/restaurant/page.tsx')).toContain('Kitchen waste');
  });

  it('VERT-R04 modifiers price + ingredient shape', () => {
    const items = normalizeKotItems([
      {
        productId: 'p1',
        name: 'Burger',
        qty: 2,
        price: 1000,
        modifiers: [{ name: 'Cheese', priceDelta: 150, ingredientProductId: 'cheese' }],
      },
    ]);
    expect(lineUnitPriceWithModifiers(items[0])).toBe(1150);
    expect(items[0].modifiers?.[0].ingredientProductId).toBe('cheese');
    expect(read('src/lib/restaurant/modifiers.ts')).toContain('lineUnitPriceWithModifiers');
    expect(read('src/lib/restaurant/restaurant-service.ts')).toContain('normalizeKotItems');
  });

  it('VERT-S03 stylist commission helpers', () => {
    expect(resolveCommissionPct('Senior Stylist')).toBe(15);
    expect(computeCommissionAmount(1500, 15)).toBe(225);
    expect(read('src/lib/salon/complete-appointment.ts')).toContain('commissionAmount');
  });

  it('VERT-S04 public book route + page', () => {
    expect(fs.existsSync(path.join(root, 'src/app/api/appointments/public/route.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/shop/appointments/book/page.tsx'))).toBe(true);
  });

  it('VERT-C02 itemType + C03 costModel engines', () => {
    expect(ALL_PRODUCT_ITEM_TYPES).toContain('SERVICE');
    expect(read('src/db/schema.ts')).toContain("itemType: text('item_type')");
    expect(parseEngines({ engines: { costModel: 'RECIPE' } }).costModel).toBe('RECIPE');
    expect(costModelForVertical('salon')).toBe('SERVICE_BOM');
    expect(read('src/app/api/config/flags/route.ts')).toContain('engines');
  });

  it('VERT-M01/M02 spend ledger + order UTM columns', () => {
    expect(fs.existsSync(path.join(root, 'src/app/api/marketing/spend/route.ts'))).toBe(true);
    expect(read('src/db/schema.ts')).toContain('marketingSpend');
    expect(read('src/db/schema.ts')).toContain('campaignId');
    expect(read('src/lib/db/repositories/checkout-repo.ts')).toContain('utmJson');
    expect(read('drizzle/migrations/0014_vertical_depth_wave_b.sql')).toContain('marketing_spend');
  });
});
