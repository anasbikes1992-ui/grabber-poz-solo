import { describe, expect, it } from 'vitest';
import { comparePartQualities, lookupRepairCatalogQuote } from '@/lib/repairs/catalog';
import { listRepairBrands, listRepairModels } from '@/lib/repairs/device-tree';
import { VERTICAL_PRESETS } from '@/lib/config/vertical-presets';
import { calcHpEmi } from '@/lib/verticals/math';
import { appraiseTradeIn } from '@/lib/trade-in/trade-in-appraisal';
import { matchVariantByAttrs, parseElectronicsAttrs } from '@/lib/electronics/variant-attrs';

describe('MobileRepair alignment', () => {
  it('mobilerepair preset enables repairs, HP, appointments', () => {
    const p = VERTICAL_PRESETS.mobilerepair;
    expect(p.flags.repairs).toBe(true);
    expect(p.flags.hirePurchase).toBe(true);
    expect(p.flags.appointments).toBe(true);
    expect(p.vertical).toBe('mobilerepair');
  });

  it('device tree lists Apple iPhone models', () => {
    expect(listRepairBrands()).toContain('Apple');
    const models = listRepairModels('Apple', 'iPhone');
    expect(models).toContain('iPhone 14 Pro');
  });

  it('OEM screen repair costs more than Grade A', () => {
    const cmp = comparePartQualities({ brand: 'Apple', deviceModel: 'iPhone 14 Pro', repairCategory: 'SCREEN' });
    expect(cmp.oem.estimatedCostLkr).toBeGreaterThan(cmp.gradeA.estimatedCostLkr);
    expect(cmp.oem.warrantyDays).toBeGreaterThanOrEqual(cmp.gradeA.warrantyDays);
  });

  it('lookupRepairCatalogQuote returns structured entry', () => {
    const q = lookupRepairCatalogQuote({
      brand: 'Samsung',
      deviceModel: 'Galaxy S24 Ultra',
      repairCategory: 'BATTERY',
      partQuality: 'OEM_ORIGINAL',
    });
    expect(q.estimatedCostLkr).toBeGreaterThan(0);
    expect(q.estimatedMinutes).toBeGreaterThan(0);
  });

  it('BNPL HP EMI calculation', () => {
    expect(calcHpEmi(340000, 68000, 12)).toBeGreaterThan(20000);
  });

  it('trade-in grade A appraisal', () => {
    expect(appraiseTradeIn(170000, 'A')).toBe(110500);
  });

  it('electronics variant attrs parse storage and warranty', () => {
    const attrs = parseElectronicsAttrs({ Storage: '256GB', Condition: 'SEALED_NEW', Warranty: 'TRCSL_COMPANY_1Y' });
    expect(attrs.storage).toBe('256GB');
    expect(attrs.condition).toBe('SEALED_NEW');
    const matched = matchVariantByAttrs(
      [
        {
          id: '1',
          productId: 'p1',
          sku: 'x',
          storage: '256GB',
          color: 'Black',
          condition: 'SEALED_NEW',
          warrantyType: 'TRCSL_COMPANY_1Y',
          regularPrice: 100,
          salePrice: 100,
          stockOnHand: 1,
        },
      ],
      { storage: '256GB', condition: 'SEALED_NEW' },
    );
    expect(matched?.id).toBe('1');
  });
});
