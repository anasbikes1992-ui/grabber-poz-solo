export type VerticalPresetId = 'fashion' | 'electronics' | 'grocery' | 'restaurant' | 'wholesale' | 'full';

export type VerticalFlags = {
  repairs: boolean;
  restaurant: boolean;
  hirePurchase: boolean;
  appointments: boolean;
  loyalty: boolean;
  wholesale: boolean;
  whatsapp: boolean;
  creative: boolean;
};

export const VERTICAL_PRESETS: Record<
  VerticalPresetId,
  { label: string; description: string; vertical: string; flags: VerticalFlags }
> = {
  fashion: {
    label: 'Fashion & apparel',
    description: 'Variant matrix, markdowns, return grading',
    vertical: 'fashion',
    flags: {
      repairs: false,
      restaurant: false,
      hirePurchase: false,
      appointments: false,
      loyalty: true,
      wholesale: true,
      whatsapp: true,
      creative: true,
    },
  },
  electronics: {
    label: 'Electronics & mobile',
    description: 'Serial/IMEI tracking, repairs, hire purchase',
    vertical: 'electronics',
    flags: {
      repairs: true,
      restaurant: false,
      hirePurchase: true,
      appointments: true,
      loyalty: true,
      wholesale: false,
      whatsapp: true,
      creative: true,
    },
  },
  grocery: {
    label: 'Grocery & FMCG',
    description: 'Batch lots, FEFO, near-expiry promos',
    vertical: 'grocery',
    flags: {
      repairs: false,
      restaurant: false,
      hirePurchase: false,
      appointments: false,
      loyalty: true,
      wholesale: true,
      whatsapp: true,
      creative: false,
    },
  },
  restaurant: {
    label: 'Restaurant & café',
    description: 'Table service, KDS, recipe BOM',
    vertical: 'restaurant',
    flags: {
      repairs: false,
      restaurant: true,
      hirePurchase: false,
      appointments: true,
      loyalty: true,
      wholesale: false,
      whatsapp: true,
      creative: true,
    },
  },
  wholesale: {
    label: 'Wholesale / B2B',
    description: 'Quotations, credit limits, AR aging',
    vertical: 'wholesale',
    flags: {
      repairs: false,
      restaurant: false,
      hirePurchase: false,
      appointments: false,
      loyalty: false,
      wholesale: true,
      whatsapp: true,
      creative: false,
    },
  },
  full: {
    label: 'Full platform (demo)',
    description: 'All vertical modules enabled',
    vertical: 'multi',
    flags: {
      repairs: true,
      restaurant: true,
      hirePurchase: true,
      appointments: true,
      loyalty: true,
      wholesale: true,
      whatsapp: true,
      creative: true,
    },
  },
};
