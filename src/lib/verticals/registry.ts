/**
 * GRABBER BUSINESS OS — VERTICAL PACK REGISTRY
 * Resolves active vertical configurations based on business settings.
 */

import { readConfigJson } from '@/lib/config/business-settings';
import type { VerticalPack, VerticalType } from './types';
import { GROCERY_PACK } from './packs/grocery';
import { FASHION_PACK } from './packs/fashion';
import { ELECTRONICS_PACK } from './packs/electronics';
import { RESTAURANT_PACK } from './packs/restaurant';
import { HARDWARE_PACK } from './packs/hardware';
import { GENERAL_RETAIL_PACK } from './packs/general-retail';

export const VERTICAL_REGISTRY: Record<VerticalType, VerticalPack> = {
  GENERAL_RETAIL: GENERAL_RETAIL_PACK,
  GROCERY: GROCERY_PACK,
  FASHION: FASHION_PACK,
  ELECTRONICS: ELECTRONICS_PACK,
  RESTAURANT: RESTAURANT_PACK,
  HARDWARE: HARDWARE_PACK,
  PHARMACY: { ...GENERAL_RETAIL_PACK, id: 'PHARMACY', name: 'Pharmacy & Healthcare' },
  BEAUTY: { ...FASHION_PACK, id: 'BEAUTY', name: 'Beauty & Cosmetics' },
  AUTOPARTS: { ...HARDWARE_PACK, id: 'AUTOPARTS', name: 'Auto Parts & Spare Store' },
  WHOLESALE: { ...HARDWARE_PACK, id: 'WHOLESALE', name: 'Wholesale & B2B Distribution' },
};

export function getVerticalPack(type: VerticalType | string = 'GENERAL_RETAIL'): VerticalPack {
  const normalized = (type || 'GENERAL_RETAIL').toUpperCase() as VerticalType;
  return VERTICAL_REGISTRY[normalized] || GENERAL_RETAIL_PACK;
}

export async function getActiveVerticalPack(): Promise<VerticalPack> {
  try {
    const cfg = await readConfigJson();
    const primaryVertical = (cfg.primaryVertical as string) || 'GENERAL_RETAIL';
    return getVerticalPack(primaryVertical);
  } catch {
    return GENERAL_RETAIL_PACK;
  }
}

export function listAllVerticalPacks(): VerticalPack[] {
  return Object.values(VERTICAL_REGISTRY);
}
