/**
 * GRABBER BUSINESS OS — COMMERCIAL EDITION
 *
 * Grabber is sold as one all-in-one product: Grabber Business OS Pro.
 * Every client receives the full supported platform. Differences between
 * clients are configured through vertical packs and provider readiness, not
 * through feature-tier packages.
 */

import { readConfigJson, mergeConfigJson } from '@/lib/config/business-settings';

export type GrabberPlanMode = 'pro';
export type GrabberVerticalPack =
  | 'retail_wholesale'
  | 'electronics_repairs'
  | 'restaurant_cafe'
  | 'salon_services'
  | 'party_events'
  | 'grocery_pharmacy';

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
  approvalControlledExecute: boolean;
}

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
  approvalControlledExecute: true,
};

export const DEFAULT_VERTICAL_PACKS: GrabberVerticalPack[] = ['retail_wholesale'];

/**
 * Read the current commercial edition.
 * Legacy installs may still carry `basic`; it is deliberately coerced to `pro`
 * so no supported client is feature-gated by an old tier flag.
 */
export async function getGrabberPlanMode(): Promise<GrabberPlanMode> {
  return 'pro';
}

/**
 * Persist the single commercial edition. Accepts only `pro`; legacy callers that
 * send `basic` are migrated to `pro`.
 */
export async function setGrabberPlanMode(_mode: GrabberPlanMode | 'basic' = 'pro'): Promise<void> {
  await mergeConfigJson({ planMode: 'pro' });
}

export async function getEnabledVerticalPacks(): Promise<GrabberVerticalPack[]> {
  try {
    const cfg = await readConfigJson();
    const packs = Array.isArray(cfg?.verticalPacks) ? cfg.verticalPacks : DEFAULT_VERTICAL_PACKS;
    return packs.filter((pack): pack is GrabberVerticalPack =>
      [
        'retail_wholesale',
        'electronics_repairs',
        'restaurant_cafe',
        'salon_services',
        'party_events',
        'grocery_pharmacy',
      ].includes(pack),
    );
  } catch {
    return DEFAULT_VERTICAL_PACKS;
  }
}

export async function setEnabledVerticalPacks(packs: GrabberVerticalPack[]): Promise<void> {
  const safePacks = packs.length ? packs : DEFAULT_VERTICAL_PACKS;
  await mergeConfigJson({ planMode: 'pro', verticalPacks: safePacks });
}

export function getPlanFeatures(_mode: GrabberPlanMode = 'pro'): PlanFeatureMatrix {
  return PRO_PLAN_FEATURES;
}
