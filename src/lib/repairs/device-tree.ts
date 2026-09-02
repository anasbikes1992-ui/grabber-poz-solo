/** Brand → category → models (MobileRepair device selector tree). */

export const REPAIR_DEVICE_TREE: Record<string, Record<string, string[]>> = {
  Apple: {
    iPhone: [
      'iPhone 15 Pro Max',
      'iPhone 15 Pro',
      'iPhone 15',
      'iPhone 14 Pro Max',
      'iPhone 14 Pro',
      'iPhone 14',
      'iPhone 13',
      'iPhone 12',
      'iPhone SE (3rd Gen)',
    ],
    iPad: ['iPad Pro 12.9"', 'iPad Air', 'iPad Mini', 'iPad (10th Gen)'],
    MacBook: ['MacBook Pro 14"', 'MacBook Pro 16"', 'MacBook Air M2', 'MacBook Air M1'],
    Watch: ['Apple Watch Ultra 2', 'Apple Watch Series 9', 'Apple Watch SE'],
  },
  Samsung: {
    Galaxy: [
      'Galaxy S24 Ultra',
      'Galaxy S24+',
      'Galaxy S24',
      'Galaxy S23',
      'Galaxy A54',
      'Galaxy Z Fold5',
      'Galaxy Z Flip5',
    ],
    Tablet: ['Galaxy Tab S9', 'Galaxy Tab A8'],
  },
  Google: { Pixel: ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7a'] },
  Xiaomi: { Phone: ['Redmi Note 13 Pro', 'POCO X6 Pro', 'Mi 13'] },
  OnePlus: { Phone: ['OnePlus 12', 'OnePlus Nord 3'] },
  JBL: { Speaker: ['JBL Charge 5', 'JBL Flip 6', 'JBL Go 3'] },
};

export const REPAIR_CATEGORIES = [
  { id: 'SCREEN', label: 'Screen / Display', slug: 'screen-glass-repair' },
  { id: 'BATTERY', label: 'Battery', slug: 'battery-replacement' },
  { id: 'CHARGING_PORT', label: 'Charging Port', slug: 'charging-power' },
  { id: 'BACK_GLASS', label: 'Back Glass', slug: 'screen-glass-repair' },
  { id: 'CAMERA_LENS', label: 'Camera / Lens', slug: 'camera-speaker' },
  { id: 'MOTHERBOARD_IC', label: 'Board / IC Level', slug: 'other-repairs' },
] as const;

export type RepairCategoryId = (typeof REPAIR_CATEGORIES)[number]['id'];

export function listRepairBrands() {
  return Object.keys(REPAIR_DEVICE_TREE);
}

export function listRepairCategories(brand: string) {
  return REPAIR_DEVICE_TREE[brand] ? Object.keys(REPAIR_DEVICE_TREE[brand]) : [];
}

export function listRepairModels(brand: string, category: string) {
  return REPAIR_DEVICE_TREE[brand]?.[category] || [];
}
