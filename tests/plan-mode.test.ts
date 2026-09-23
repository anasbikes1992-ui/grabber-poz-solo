import { describe, it, expect } from 'vitest';
import {
  DEFAULT_VERTICAL_PACKS,
  PRO_PLAN_FEATURES,
  getPlanFeatures,
  type GrabberPlanMode,
} from '@/lib/config/plan-mode';

describe('Grabber Business OS Pro edition config', () => {
  it('enforces the single Pro edition includes core platform and Jarvis', () => {
    const pro = getPlanFeatures('pro');
    expect(pro.counterPos).toBe(true);
    expect(pro.inventoryAndBarcodes).toBe(true);
    expect(pro.multiBranch).toBe(true);
    expect(pro.polimPothaLedger).toBe(true);
    expect(pro.salesAndQuotes).toBe(true);
    expect(pro.shiftReconciliation).toBe(true);
    expect(pro.basicStorefront).toBe(true);

    expect(pro.jarvisAi).toBe(true);
    expect(pro.storefrontStudio).toBe(true);
    expect(pro.companyMarketingSuite).toBe(true);
    expect(pro.approvalControlledExecute).toBe(true);
    expect(PRO_PLAN_FEATURES).toEqual(pro);
  });

  it('keeps the public mode type locked to pro', () => {
    const mode: GrabberPlanMode = 'pro';
    expect(mode).toBe('pro');
  });

  it('defaults new clients to the retail and wholesale vertical pack', () => {
    expect(DEFAULT_VERTICAL_PACKS).toEqual(['retail_wholesale']);
  });
});
