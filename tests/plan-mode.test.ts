import { describe, it, expect } from 'vitest';
import {
  BASIC_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
  getPlanFeatures,
  type GrabberPlanMode,
} from '@/lib/config/plan-mode';

describe('Grabber POS Plan Modes (Basic vs Pro)', () => {
  it('enforces Basic mode has all ERP/POS features but NO Jarvis AI', () => {
    const basic = getPlanFeatures('basic');
    expect(basic.counterPos).toBe(true);
    expect(basic.inventoryAndBarcodes).toBe(true);
    expect(basic.multiBranch).toBe(true);
    expect(basic.polimPothaLedger).toBe(true);
    expect(basic.salesAndQuotes).toBe(true);
    expect(basic.shiftReconciliation).toBe(true);
    expect(basic.basicStorefront).toBe(true);

    // Jarvis is strictly excluded in Basic mode
    expect(basic.jarvisAi).toBe(false);
    expect(basic.storefrontStudio).toBe(false);
    expect(basic.companyMarketingSuite).toBe(false);
  });

  it('enforces Pro mode includes Jarvis AI and advanced studio', () => {
    const pro = getPlanFeatures('pro');
    expect(pro.counterPos).toBe(true);
    expect(pro.inventoryAndBarcodes).toBe(true);
    expect(pro.multiBranch).toBe(true);
    expect(pro.polimPothaLedger).toBe(true);

    // Jarvis, Storefront Studio, and Company Suite are enabled in Pro
    expect(pro.jarvisAi).toBe(true);
    expect(pro.storefrontStudio).toBe(true);
    expect(pro.companyMarketingSuite).toBe(true);
  });
});
