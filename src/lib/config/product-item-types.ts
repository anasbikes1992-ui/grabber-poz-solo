/**
 * Unified product item taxonomy — maps business nature → catalog + POS behaviour.
 * Stored on products as metadata until schema migration adds item_type column.
 */

export type ProductItemType =
  | 'PHYSICAL'
  | 'SERIALIZED'
  | 'SERVICE'
  | 'PART'
  | 'RAW_INGREDIENT'
  | 'PREPARED_FOOD'
  | 'CUSTOM_QUOTE';

export type PosMode =
  | 'RETAIL_SALE'
  | 'REPAIR_INTAKE'
  | 'HP_COLLECTION'
  | 'WHOLESALE_QUOTE'
  | 'TABLE_SERVICE'
  | 'KDS';

export const PRODUCT_ITEM_TYPE_LABELS: Record<ProductItemType, string> = {
  PHYSICAL: 'Physical stock (standard SKU)',
  SERIALIZED: 'Serialized / IMEI tracked',
  SERVICE: 'Service / labor line',
  PART: 'Repair spare part',
  RAW_INGREDIENT: 'Recipe raw ingredient',
  PREPARED_FOOD: 'Prepared food / menu item',
  CUSTOM_QUOTE: 'Custom quote / bulk line',
};

export const POS_MODE_LABELS: Record<PosMode, string> = {
  RETAIL_SALE: 'Counter retail sale',
  REPAIR_INTAKE: 'Device repair intake ticket',
  HP_COLLECTION: 'Hire purchase EMI collection',
  WHOLESALE_QUOTE: 'Wholesale quotation → order',
  TABLE_SERVICE: 'Restaurant table service',
  KDS: 'Kitchen display (KDS)',
};

export const ALL_PRODUCT_ITEM_TYPES: ProductItemType[] = [
  'PHYSICAL',
  'SERIALIZED',
  'SERVICE',
  'PART',
  'RAW_INGREDIENT',
  'PREPARED_FOOD',
  'CUSTOM_QUOTE',
];

export const ALL_POS_MODES: PosMode[] = [
  'RETAIL_SALE',
  'REPAIR_INTAKE',
  'HP_COLLECTION',
  'WHOLESALE_QUOTE',
  'TABLE_SERVICE',
  'KDS',
];
