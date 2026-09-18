/** Shared POS terminal types — extracted for maintainability (no behavior change). */

export type LoyaltyMember = {
  id: string;
  name: string;
  phone: string;
  points: number;
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  totalSpent?: number;
};

export type PosCartItem = {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  variant: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  taxRate: number;
};

export type PosCatalogItem = {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  variant: string;
  unitPrice: number;
  unitCost: number;
  barcode: string;
  stock: number;
};

export type HeldSale = {
  id: string;
  orderNumber: string;
  grandTotal: string | number;
  itemCount: number;
  createdAt: string;
  customerName?: string | null;
};

export type PinAction =
  | { type: 'DISCOUNT'; payload?: number }
  | { type: 'VOID' }
  | { type: 'CREDIT'; payload?: unknown }
  | { type: 'OPEN_DRAWER' };

/** Offline / demo catalog fallback when API catalog is empty (dev UX only). */
export const POS_DEMO_CATALOG: PosCatalogItem[] = [
  {
    id: 'prod_1',
    productId: 'prod_1',
    name: 'Linen Casual Shirt',
    variant: 'Size L / Blue',
    unitPrice: 4500.0,
    unitCost: 2500.0,
    barcode: '8901234567890',
    stock: 31,
  },
  {
    id: 'prod_2',
    productId: 'prod_2',
    name: 'Oxford Button-Down',
    variant: 'Size M / White',
    unitPrice: 5200.0,
    unitCost: 2800.0,
    barcode: '8901234567891',
    stock: 18,
  },
  {
    id: 'prod_3',
    productId: 'prod_3',
    name: 'Stretch Chino Trousers',
    variant: '32 / Khaki',
    unitPrice: 6500.0,
    unitCost: 3400.0,
    barcode: '8901234567892',
    stock: 24,
  },
  {
    id: 'prod_4',
    productId: 'prod_4',
    name: 'Pique Cotton Polo',
    variant: 'Size XL / Navy',
    unitPrice: 3800.0,
    unitCost: 1900.0,
    barcode: '8901234567893',
    stock: 12,
  },
];
