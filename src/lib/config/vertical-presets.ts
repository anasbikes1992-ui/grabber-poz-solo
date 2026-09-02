import type { PosMode, ProductItemType } from '@/lib/config/product-item-types';

export type VerticalPresetId =
  | 'mobilerepair'
  | 'electronics'
  | 'fashion'
  | 'grocery'
  | 'restaurant'
  | 'wholesale'
  | 'hybrid'
  | 'full';

/** Composable capability modules — toggled per merchant after preset selection. */
export type VerticalFlags = {
  repairs: boolean;
  restaurant: boolean;
  hirePurchase: boolean;
  appointments: boolean;
  loyalty: boolean;
  wholesale: boolean;
  grocery: boolean;
  whatsapp: boolean;
  creative: boolean;
};

export type VerticalPreset = {
  id: VerticalPresetId;
  label: string;
  description: string;
  natureOfBusiness: string;
  exampleMerchant: string;
  vertical: string;
  flags: VerticalFlags;
  itemTypes: ProductItemType[];
  posModes: PosMode[];
  adaptedWorkflows: string[];
};

const ALL_FLAGS_ON: VerticalFlags = {
  repairs: true,
  restaurant: true,
  hirePurchase: true,
  appointments: true,
  loyalty: true,
  wholesale: true,
  grocery: true,
  whatsapp: true,
  creative: true,
};

/**
 * Hybrid presets + composable module flags.
 * Presets set sensible defaults; merchants fine-tune in Settings → Verticals.
 */
export const VERTICAL_PRESETS: Record<VerticalPresetId, VerticalPreset> = {
  mobilerepair: {
    id: 'mobilerepair',
    label: 'Mobile Repair Shop',
    description: 'Device retail, OEM/Grade A repairs, trade-in, HP, courier pickup booking',
    natureOfBusiness: 'Mobile phone retail & repair center',
    exampleMerchant: 'MobileRepair.lk-style phone shop & service hub',
    vertical: 'mobilerepair',
    flags: {
      repairs: true,
      restaurant: false,
      hirePurchase: true,
      appointments: true,
      loyalty: true,
      wholesale: false,
      grocery: false,
      whatsapp: true,
      creative: true,
    },
    itemTypes: ['SERIALIZED', 'PHYSICAL', 'SERVICE', 'PART'],
    posModes: ['RETAIL_SALE', 'REPAIR_INTAKE', 'HP_COLLECTION'],
    adaptedWorkflows: [
      'Repair estimator at /shop/repairs/book',
      'OEM vs Grade A repair pricing matrix',
      'Trade-in credit at POS checkout',
      'IMEI lifecycle + HP EMI collection',
    ],
  },
  electronics: {
    id: 'electronics',
    label: 'Mobile, Tech & Service',
    description: 'IMEI tracking, repair tickets, hire purchase, appointments',
    natureOfBusiness: 'Mobile, Tech & Service',
    exampleMerchant: 'Phone shop, laptop repair hub, appliance store',
    vertical: 'electronics',
    flags: {
      repairs: true,
      restaurant: false,
      hirePurchase: true,
      appointments: true,
      loyalty: true,
      wholesale: false,
      grocery: false,
      whatsapp: true,
      creative: true,
    },
    itemTypes: ['SERIALIZED', 'PHYSICAL', 'SERVICE', 'PART'],
    posModes: ['RETAIL_SALE', 'REPAIR_INTAKE', 'HP_COLLECTION'],
    adaptedWorkflows: [
      'Serialized IMEI scan at GRN and checkout',
      'Device repair ticket intake with printable QR',
      'HP EMI monthly payment collection',
    ],
  },
  fashion: {
    id: 'fashion',
    label: 'Fashion & Apparel Retail',
    description: 'Variant matrix, loyalty, wholesale tiers, creative promos',
    natureOfBusiness: 'Fashion & Apparel Retail',
    exampleMerchant: 'Garment store, shoe shop, boutique',
    vertical: 'fashion',
    flags: {
      repairs: false,
      restaurant: false,
      hirePurchase: false,
      appointments: false,
      loyalty: true,
      wholesale: true,
      grocery: false,
      whatsapp: true,
      creative: true,
    },
    itemTypes: ['PHYSICAL'],
    posModes: ['RETAIL_SALE'],
    adaptedWorkflows: [
      'Fast size–color variant matrix grid',
      'Barcode sticker printing',
      'Return inspection and store credit',
    ],
  },
  grocery: {
    id: 'grocery',
    label: 'Supermarket & FMCG',
    description: 'Batch lots, FEFO picks, near-expiry promos',
    natureOfBusiness: 'Supermarket & FMCG',
    exampleMerchant: 'Minimart, pharmacy, grocery',
    vertical: 'grocery',
    flags: {
      repairs: false,
      restaurant: false,
      hirePurchase: false,
      appointments: false,
      loyalty: true,
      wholesale: true,
      grocery: true,
      whatsapp: true,
      creative: false,
    },
    itemTypes: ['PHYSICAL'],
    posModes: ['RETAIL_SALE'],
    adaptedWorkflows: [
      'High-speed barcode checkout',
      'Batch / expiry tracking (FEFO)',
      'Near-expiry auto-discount promos',
    ],
  },
  restaurant: {
    id: 'restaurant',
    label: 'Restaurant & Café',
    description: 'Table layout, KDS, recipe BOM depletion',
    natureOfBusiness: 'Restaurant & Café',
    exampleMerchant: 'Café, bakery, dine-in restaurant',
    vertical: 'restaurant',
    flags: {
      repairs: false,
      restaurant: true,
      hirePurchase: false,
      appointments: true,
      loyalty: true,
      wholesale: false,
      grocery: false,
      whatsapp: true,
      creative: true,
    },
    itemTypes: ['PREPARED_FOOD', 'RAW_INGREDIENT', 'PHYSICAL'],
    posModes: ['TABLE_SERVICE', 'KDS', 'RETAIL_SALE'],
    adaptedWorkflows: [
      'Visual table layout grid',
      'Kitchen Display System (KDS)',
      'Bill splitting and recipe BOM deduction',
    ],
  },
  wholesale: {
    id: 'wholesale',
    label: 'Wholesale & Distribution',
    description: 'Quotations, Polim credit limits, AR aging',
    natureOfBusiness: 'Wholesale & Distribution',
    exampleMerchant: 'Hardware agent, food wholesaler',
    vertical: 'wholesale',
    flags: {
      repairs: false,
      restaurant: false,
      hirePurchase: false,
      appointments: false,
      loyalty: false,
      wholesale: true,
      grocery: false,
      whatsapp: true,
      creative: false,
    },
    itemTypes: ['PHYSICAL', 'CUSTOM_QUOTE'],
    posModes: ['WHOLESALE_QUOTE', 'RETAIL_SALE'],
    adaptedWorkflows: [
      'Polim Potha credit limit check',
      'Quotation-to-order conversion',
      'Tiered volume pricing',
    ],
  },
  hybrid: {
    id: 'hybrid',
    label: 'Hybrid / Multi-Category',
    description: 'Repair + retail + wholesale — dynamic POS mode switcher',
    natureOfBusiness: 'Hybrid / Multi-Category',
    exampleMerchant: 'Department store, phone shop + wholesale',
    vertical: 'multi',
    flags: {
      repairs: true,
      restaurant: false,
      hirePurchase: true,
      appointments: true,
      loyalty: true,
      wholesale: true,
      grocery: false,
      whatsapp: true,
      creative: true,
    },
    itemTypes: ['PHYSICAL', 'SERIALIZED', 'SERVICE', 'PART', 'CUSTOM_QUOTE'],
    posModes: ['RETAIL_SALE', 'REPAIR_INTAKE', 'HP_COLLECTION', 'WHOLESALE_QUOTE'],
    adaptedWorkflows: [
      'POS sidebar tab switcher: Retail | Repair | Wholesale',
      'Shared customer 360 across all modes',
      'Agents enabled per active module flags',
    ],
  },
  full: {
    id: 'full',
    label: 'Full platform (demo)',
    description: 'All capability modules enabled for training / demos',
    natureOfBusiness: 'Demo / training environment',
    exampleMerchant: 'Grabber sandbox merchant',
    vertical: 'multi',
    flags: ALL_FLAGS_ON,
    itemTypes: ['PHYSICAL', 'SERIALIZED', 'SERVICE', 'PART', 'RAW_INGREDIENT', 'PREPARED_FOOD', 'CUSTOM_QUOTE'],
    posModes: ['RETAIL_SALE', 'REPAIR_INTAKE', 'HP_COLLECTION', 'WHOLESALE_QUOTE', 'TABLE_SERVICE', 'KDS'],
    adaptedWorkflows: ['All modules visible — use for demos only'],
  },
};

export function getVerticalPreset(id: string): VerticalPreset | undefined {
  return VERTICAL_PRESETS[id as VerticalPresetId];
}

export function listVerticalPresets(): VerticalPreset[] {
  return Object.values(VERTICAL_PRESETS);
}

/** Merge saved flags with preset defaults when presetId stored in config. */
export function resolveVerticalFlags(
  partial: Partial<VerticalFlags>,
  presetId?: VerticalPresetId,
): VerticalFlags {
  const base = presetId ? VERTICAL_PRESETS[presetId].flags : VERTICAL_PRESETS.fashion.flags;
  return { ...base, ...partial };
}
