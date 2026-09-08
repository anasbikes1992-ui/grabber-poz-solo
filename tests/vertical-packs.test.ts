import { describe, it, expect } from 'vitest';
import { getVerticalPack, listAllVerticalPacks } from '@/lib/verticals/registry';
import { GROCERY_PACK } from '@/lib/verticals/packs/grocery';
import { FASHION_PACK } from '@/lib/verticals/packs/fashion';
import { ELECTRONICS_PACK } from '@/lib/verticals/packs/electronics';
import { RESTAURANT_PACK } from '@/lib/verticals/packs/restaurant';
import { HARDWARE_PACK } from '@/lib/verticals/packs/hardware';

describe('Vertical Intelligence Packs', () => {
  it('lists all configured vertical domain packs', () => {
    const packs = listAllVerticalPacks();
    expect(packs.length).toBeGreaterThanOrEqual(6);
  });

  it('correctly retrieves specialized Grocery vertical pack', () => {
    const pack = getVerticalPack('GROCERY');
    expect(pack.id).toBe('GROCERY');
    expect(pack.inventoryRules.enableBatchExpiryTracking).toBe(true);
    expect(pack.inventoryRules.defaultLeadTimeDays).toBe(2);
    expect(pack.kpiWeightings.inventoryWeight).toBe(35);
  });

  it('correctly retrieves specialized Fashion vertical pack', () => {
    const pack = getVerticalPack('FASHION');
    expect(pack.id).toBe('FASHION');
    expect(pack.inventoryRules.deadStockThresholdDays).toBe(60);
    expect(pack.marketingAngles).toContain('New Seasonal Collection Drop');
  });

  it('correctly retrieves specialized Electronics vertical pack', () => {
    const pack = getVerticalPack('ELECTRONICS');
    expect(pack.id).toBe('ELECTRONICS');
    expect(pack.inventoryRules.enableSerializedTracking).toBe(true);
    expect(pack.seoTemplates.primaryKeywords).toContain('phone repair Colombo');
  });

  it('correctly retrieves specialized Restaurant vertical pack', () => {
    const pack = getVerticalPack('RESTAURANT');
    expect(pack.id).toBe('RESTAURANT');
    expect(pack.inventoryRules.defaultLeadTimeDays).toBe(1);
    expect(pack.seoTemplates.defaultSchemaType).toBe('Restaurant');
  });

  it('falls back safely to General Retail for unconfigured types', () => {
    const pack = getVerticalPack('UNKNOWN_SPECIALTY');
    expect(pack.id).toBe('GENERAL_RETAIL');
    expect(pack.kpiWeightings.salesWeight).toBe(25);
  });
});
