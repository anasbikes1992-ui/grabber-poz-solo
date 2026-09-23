/**
 * GRABBER BUSINESS OS — PLAN MODES (BASIC vs PRO)
 *
 * Basic Mode: Full POS & ERP suite (Counter POS, multi-branch, inventory & barcodes,
 *             stock transfers, customer CRM, Polim Potha credit ledger, sales, quotes,
 *             shifts, receipts, basic storefront catalog & checkout).
 *             Does NOT include Jarvis Autonomous AI Copilot.
 *
 * Pro Mode:   Includes everything in Basic + Jarvis AI Copilot (live DB grounding,
 *             voice queries, restock alerts, demand forecasting) + Advanced Storefront
 *             Studio & Themes + Company Marketing Suite.
 */

import { readConfigJson, mergeConfigJson } from '@/lib/config/business-settings';

export type GrabberPlanMode = 'basic' | 'pro';

export interface PlanFeatureMatrix {
  counterPos: boolean;
  inventoryAndBarcodes: boolean;
  multiBranch: boolean;
  polimPothaLedger: boolean;
  salesAndQuotes: boolean;
  shiftReconciliation: boolean;
  basicStorefront: boolean;
  jarvisAi: boolean;
  storefrontStudio: boolean;
  companyMarketingSuite: boolean;
}

export const BASIC_PLAN_FEATURES: PlanFeatureMatrix = {
  counterPos: true,
  inventoryAndBarcodes: true,
  multiBranch: true,
  polimPothaLedger: true,
  salesAndQuotes: true,
  shiftReconciliation: true,
  basicStorefront: true,
  jarvisAi: false,
  storefrontStudio: false,
  companyMarketingSuite: false,
};

export const PRO_PLAN_FEATURES: PlanFeatureMatrix = {
  counterPos: true,
  inventoryAndBarcodes: true,
  multiBranch: true,
  polimPothaLedger: true,
  salesAndQuotes: true,
  shiftReconciliation: true,
  basicStorefront: true,
  jarvisAi: true,
  storefrontStudio: true,
  companyMarketingSuite: true,
};

/**
 * Read the current plan mode.
 * Evaluates DB business settings first, then falls back to env variable `GRABBER_PLAN_MODE`,
 * and defaults to 'pro'.
 */
export async function getGrabberPlanMode(): Promise<GrabberPlanMode> {
  try {
    const cfg = await readConfigJson();
    if (cfg?.planMode === 'basic' || cfg?.planMode === 'pro') {
      return cfg.planMode;
    }
  } catch {
    /* ignore DB read error */
  }

  const envMode = (
    process.env.GRABBER_PLAN_MODE ||
    process.env.NEXT_PUBLIC_GRABBER_PLAN_MODE ||
    'pro'
  ).toLowerCase();

  return envMode === 'basic' ? 'basic' : 'pro';
}

/**
 * Set and persist plan mode into business settings config.
 */
export async function setGrabberPlanMode(mode: GrabberPlanMode): Promise<void> {
  await mergeConfigJson({ planMode: mode });
}

export function getPlanFeatures(mode: GrabberPlanMode): PlanFeatureMatrix {
  return mode === 'basic' ? BASIC_PLAN_FEATURES : PRO_PLAN_FEATURES;
}
