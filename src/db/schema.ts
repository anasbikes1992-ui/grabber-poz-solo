import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, uuid, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// ENUMS
// ==========================================

export const roleEnum = pgEnum('role_enum', [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'CASHIER',
  'WAREHOUSE',
  'ACCOUNTANT',
  'MARKETING',
]);

export const locationTypeEnum = pgEnum('location_type_enum', [
  'BRANCH',
  'WAREHOUSE',
]);

export const orderChannelEnum = pgEnum('order_channel_enum', [
  'POS',
  'STOREFRONT',
  'WHATSAPP',
  'JARVIS',
  'MANUAL',
  'IMPORT',
  'API',
]);

export const orderStatusEnum = pgEnum('order_status_enum', [
  'DRAFT',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
]);

export const paymentStatusEnum = pgEnum('payment_status_enum', [
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
]);

export const fulfillmentStatusEnum = pgEnum('fulfillment_status_enum', [
  'PENDING',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'RETURNED',
]);

export const paymentMethodEnum = pgEnum('payment_method_enum', [
  'CASH',
  'CARD',
  'WEBXPAY',
  'PAYHERE',
  'STRIPE',
  'CREDIT',
  'COD',
]);

export const stockMovementTypeEnum = pgEnum('stock_movement_type_enum', [
  'PURCHASE_RECEIPT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'SALE',
  'RETURN',
  'ADJUSTMENT',
  'COUNT',
  'DAMAGE',
  'RESERVATION',
  'RELEASE',
]);

export const polimPothaEntryTypeEnum = pgEnum('polim_potha_entry_type_enum', [
  'INVOICE',
  'REPAYMENT',
  'ADJUSTMENT',
  'WRITE_OFF',
]);

export const supplierEntryTypeEnum = pgEnum('supplier_entry_type_enum', [
  'BILL',
  'PAYMENT',
  'DEBIT_NOTE',
  'ADJUSTMENT',
]);

export const accountTypeEnum = pgEnum('account_type_enum', [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE',
]);

export const actionRiskEnum = pgEnum('action_risk_enum', [
  'READ',
  'DRAFT',
  'LOW_RISK_WRITE',
  'HIGH_RISK_WRITE',
  'DESTRUCTIVE',
]);

export const mediaAssetTypeEnum = pgEnum('media_asset_type_enum', [
  'PRODUCT_IMAGE',
  'PRODUCT_VIDEO',
  'STOCK_FOOTAGE',
  'AI_GENERATED',
  'LOGO',
  'BRAND_ASSET',
  'MUSIC',
  'SFX',
  'VOICE',
  'FINISHED_VIDEO',
]);

export const creativeFormatEnum = pgEnum('creative_format_enum', [
  'SHORT_FORM_15S',
  'SHORT_FORM_30S',
  'SHORT_FORM_60S',
  'SHORT_FORM_90S',
  'LONG_FORM_2M',
  'LONG_FORM_5M',
  'LONG_FORM_10M',
  'LONG_FORM_20M',
]);

export const creativeJobStatusEnum = pgEnum('creative_job_status_enum', [
  'QUEUED',
  'GENERATING_MEDIA',
  'GENERATING_AUDIO',
  'RENDERING_FFMPEG',
  'COMPLETED',
  'FAILED',
]);

// ==========================================
// 1. BUSINESS PROFILE & CONFIGURATION
// ==========================================

export const businessProfile = pgTable('business_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  taxNumber: text('tax_number'),
  logoUrl: text('logo_url'),
  currency: text('currency').notNull().default('LKR'),
  timezone: text('timezone').notNull().default('Asia/Colombo'),
  primaryDomain: text('primary_domain'),
  receiptHeader: text('receipt_header'),
  receiptFooter: text('receipt_footer'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const businessConfig = pgTable('business_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  vertical: text('vertical').notNull().default('fashion'), // fashion, grocery, electronics, restaurant, services, wholesale, other
  enableVariants: boolean('enable_variants').notNull().default(true),
  enableSerialNumbers: boolean('enable_serial_numbers').notNull().default(false),
  enableTableService: boolean('enable_table_service').notNull().default(false),
  enableKitchenOrders: boolean('enable_kitchen_orders').notNull().default(false),
  enableCreditSales: boolean('enable_credit_sales').notNull().default(true),
  enableDelivery: boolean('enable_delivery').notNull().default(true),
  configJson: jsonb('config_json').$type<Record<string, any>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// 2. USERS, ROLES & LOCATION ASSIGNMENTS
// ==========================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: roleEnum('role').notNull().default('CASHIER'),
  hashedPin: text('hashed_pin'), // 4-6 digit manager/cashier PIN
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  address: text('address'),
  phone: text('phone'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const registers = pgTable('registers', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }), // Optional link to physical retail branch
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  address: text('address'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userAssignments = pgTable('user_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// 3. TAX CONFIGURATION ENGINE
// ==========================================

export const taxProfiles = pgTable('tax_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // STANDARD_VAT, ZERO_RATED, EXEMPT, CUSTOM
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const taxRates = pgTable('tax_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  taxProfileId: uuid('tax_profile_id').notNull().references(() => taxProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g. VAT 18%, NBT 2%
  ratePercentage: numeric('rate_percentage', { precision: 7, scale: 4 }).notNull(), // e.g. 18.0000
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  effectiveTo: timestamp('effective_to', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// 4. CATALOG & INVENTORY (PHYSICAL GOODS)
// ==========================================

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  parentId: uuid('parent_id'),
  imageUrl: text('image_url'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  taxProfileId: uuid('tax_profile_id').references(() => taxProfiles.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode'),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  salePrice: numeric('sale_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  wholesalePrice: numeric('wholesale_price', { precision: 12, scale: 2 }),
  reorderLevel: integer('reorder_level').notNull().default(10),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g. "Size L / Blue"
  sku: text('sku').notNull().unique(),
  barcode: text('barcode'),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }),
  salePrice: numeric('sale_price', { precision: 12, scale: 2 }),
  attributesJson: jsonb('attributes_json').$type<Record<string, string>>().notNull().default({}),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const stockBalances = pgTable('stock_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  locationType: locationTypeEnum('location_type').notNull(), // BRANCH or WAREHOUSE
  locationId: uuid('location_id').notNull(), // branches.id or warehouses.id
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  onHand: integer('on_hand').notNull().default(0),
  reserved: integer('reserved').notNull().default(0),
  damaged: integer('damaged').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  locProductVariantIdx: uniqueIndex('stock_balances_loc_prod_var_idx').on(t.locationType, t.locationId, t.productId, t.variantId),
}));

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  locationType: locationTypeEnum('location_type').notNull(),
  locationId: uuid('location_id').notNull(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  type: stockMovementTypeEnum('type').notNull(),
  delta: integer('delta').notNull(), // + positive or - negative
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }),
  referenceType: text('reference_type'), // ORDER, PURCHASE_ORDER, TRANSFER, ADJUSTMENT
  referenceId: text('reference_id'),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  locProdIdx: index('stock_movements_loc_prod_idx').on(t.locationId, t.productId),
  createdIdx: index('stock_movements_created_idx').on(t.createdAt),
}));

// ==========================================
// 5. CUSTOMERS & POLIM POTHA (AR CREDIT)
// ==========================================

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  address: text('address'),
  hashedPassword: text('hashed_password'), // shopper storefront login (optional)
  creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }).notNull().default('0.00'),
  segment: text('segment').notNull().default('NEW'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const polimPothaAccounts = pgTable('polim_potha_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().unique().references(() => customers.id, { onDelete: 'cascade' }),
  creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }).notNull().default('0.00'),
  currentBalance: numeric('current_balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, SUSPENDED, BLOCKED
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const polimPothaEntries = pgTable('polim_potha_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id'),
  type: polimPothaEntryTypeEnum('type').notNull(), // INVOICE, REPAYMENT, ADJUSTMENT, WRITE_OFF
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  balanceAfter: numeric('balance_after', { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  custCreatedIdx: index('polim_potha_cust_created_idx').on(t.customerId, t.createdAt),
}));

// ==========================================
// 6. SUPPLIERS & ACCOUNTS PAYABLE (AP)
// ==========================================

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  taxNumber: text('tax_number'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const supplierAccounts = pgTable('supplier_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull().unique().references(() => suppliers.id, { onDelete: 'cascade' }),
  currentBalance: numeric('current_balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  creditTermsDays: integer('credit_terms_days').notNull().default(30),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const supplierEntries = pgTable('supplier_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  poId: uuid('po_id'),
  type: supplierEntryTypeEnum('type').notNull(), // BILL, PAYMENT, DEBIT_NOTE, ADJUSTMENT
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  balanceAfter: numeric('balance_after', { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  supplierIdIdx: index('supplier_entries_supplier_id_idx').on(t.supplierId),
}));

// ==========================================
// 7. ORDERS, PAYMENTS & FULFILLMENT
// ==========================================

export const shifts = pgTable('shifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  registerId: uuid('register_id').notNull().references(() => registers.id, { onDelete: 'cascade' }),
  cashierId: uuid('cashier_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  openingFloat: numeric('opening_float', { precision: 12, scale: 2 }).notNull().default('0.00'),
  closingCash: numeric('closing_cash', { precision: 12, scale: 2 }),
  actualCard: numeric('actual_card', { precision: 12, scale: 2 }),
  variance: numeric('variance', { precision: 12, scale: 2 }),
  status: text('status').notNull().default('OPEN'), // OPEN, CLOSED
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: text('order_number').notNull().unique(),
  channel: orderChannelEnum('channel').notNull().default('POS'),
  fulfillmentLocationId: uuid('fulfillment_location_id'), // Branch or warehouse fulfilling the order
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
  registerId: uuid('register_id').references(() => registers.id, { onDelete: 'set null' }),
  shiftId: uuid('shift_id').references(() => shifts.id, { onDelete: 'set null' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  orderStatus: orderStatusEnum('order_status').notNull().default('DRAFT'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('PENDING'),
  fulfillmentStatus: fulfillmentStatusEnum('fulfillment_status').notNull().default('PENDING'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0.00'),
  discountTotal: numeric('discount_total', { precision: 12, scale: 2 }).notNull().default('0.00'),
  taxTotal: numeric('tax_total', { precision: 12, scale: 2 }).notNull().default('0.00'),
  grandTotal: numeric('grand_total', { precision: 12, scale: 2 }).notNull().default('0.00'),
  clientUuid: text('client_uuid'), // Offline idempotency key
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderNumIdx: uniqueIndex('orders_order_num_idx').on(t.orderNumber),
  channelStatusIdx: index('orders_channel_status_idx').on(t.channel, t.orderStatus),
  createdIdx: index('orders_created_idx').on(t.createdAt),
  customerIdx: index('orders_customer_id_idx').on(t.customerId),
  clientUuidIdx: index('orders_client_uuid_idx').on(t.clientUuid),
}));

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
  taxProfileId: uuid('tax_profile_id').references(() => taxProfiles.id, { onDelete: 'set null' }),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
}, (t) => ({
  orderIdIdx: index('order_items_order_id_idx').on(t.orderId),
  productIdIdx: index('order_items_product_id_idx').on(t.productId),
}));

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  method: paymentMethodEnum('method').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('LKR'),
  providerRef: text('provider_ref'), // Gateway transaction id / card auth code
  status: text('status').notNull().default('SUCCESS'), // PENDING, SUCCESS, FAILED, REFUNDED
  idempotencyKey: text('idempotency_key').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderIdIdx: index('payments_order_id_idx').on(t.orderId),
}));

export const deliveries = pgTable('deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  courierPartner: text('courier_partner'), // Prompt, Koombiyo, Domex, In-House
  trackingNumber: text('tracking_number'),
  status: fulfillmentStatusEnum('status').notNull().default('PENDING'),
  recipientName: text('recipient_name'),
  recipientPhone: text('recipient_phone'),
  deliveryAddress: text('delivery_address'),
  codAmount: numeric('cod_amount', { precision: 12, scale: 2 }),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderReturns = pgTable('order_returns', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalOrderId: uuid('original_order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  returnNumber: text('return_number').notNull().unique(),
  refundAmount: numeric('refund_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  restockApproved: boolean('restock_approved').notNull().default(true),
  reason: text('reason'),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// 8. PURCHASING & TRANSFERS
// ==========================================

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  poNumber: text('po_number').notNull().unique(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('DRAFT'), // DRAFT, SUBMITTED, APPROVED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseOrderLines = pgTable('purchase_order_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  poId: uuid('po_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }),
  orderedQty: integer('ordered_qty').notNull(),
  receivedQty: integer('received_qty').notNull().default(0),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
  totalCost: numeric('total_cost', { precision: 12, scale: 2 }).notNull(),
});

export const transfers = pgTable('transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  transferNumber: text('transfer_number').notNull().unique(),
  fromLocationType: locationTypeEnum('from_location_type').notNull(),
  fromLocationId: uuid('from_location_id').notNull(),
  toLocationType: locationTypeEnum('to_location_type').notNull(),
  toLocationId: uuid('to_location_id').notNull(),
  status: text('status').notNull().default('REQUESTED'), // REQUESTED, APPROVED, DISPATCHED, IN_TRANSIT, RECEIVED, REJECTED, CANCELLED
  requestedBy: uuid('requested_by').references(() => users.id, { onDelete: 'set null' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  receivedBy: uuid('received_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const transferLines = pgTable('transfer_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  transferId: uuid('transfer_id').notNull().references(() => transfers.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull(),
});

// ==========================================
// 9. FINANCIAL ACCOUNTING (DOUBLE-ENTRY)
// ==========================================

export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // e.g. "1010" Cash, "1020" Bank, "1100" AR, "2000" AP, "4000" Sales Revenue
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  active: boolean('active').notNull().default(true),
});

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  entryNumber: text('entry_number').notNull().unique(),
  entryDate: timestamp('entry_date', { withTimezone: true }).notNull().defaultNow(),
  referenceType: text('reference_type'), // SALE, PAYMENT, PURCHASE, EXPENSE, POLIM_POTHA
  referenceId: text('reference_id'),
  description: text('description').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const journalLines = pgTable('journal_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalEntryId: uuid('journal_entry_id').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => chartOfAccounts.id, { onDelete: 'restrict' }),
  debit: numeric('debit', { precision: 12, scale: 2 }).notNull().default('0.00'),
  credit: numeric('credit', { precision: 12, scale: 2 }).notNull().default('0.00'),
  memo: text('memo'),
}, (t) => ({
  journalEntryIdx: index('journal_lines_journal_entry_id_idx').on(t.journalEntryId),
  accountIdx: index('journal_lines_account_id_idx').on(t.accountId),
}));

// ==========================================
// 10. MEDIA LIBRARY & CREATIVE FACTORY
// ==========================================

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  assetType: mediaAssetTypeEnum('asset_type').notNull(),
  source: text('source').notNull().default('LOCAL_UPLOAD'), // LOCAL_UPLOAD, AI_GENERATED, STOCK
  license: text('license').default('COMMERCIAL_USE'),
  fileUrl: text('file_url').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes'),
  durationSeconds: numeric('duration_seconds', { precision: 6, scale: 2 }),
  resolution: text('resolution'), // e.g. "1080x1920", "1920x1080"
  tags: jsonb('tags').$type<string[]>().default([]),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const creativeProjects = pgTable('creative_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  format: creativeFormatEnum('format').notNull().default('SHORT_FORM_30S'),
  aspectRatio: text('aspect_ratio').notNull().default('9:16'), // 9:16, 1:1, 16:9
  status: text('status').notNull().default('DRAFT'), // DRAFT, SCRIPTED, RENDERING, COMPLETED, FAILED
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const creativeChapters = pgTable('creative_chapters', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => creativeProjects.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  title: text('title').notNull(),
  description: text('description'),
});

export const creativeScenes = pgTable('creative_scenes', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapterId: uuid('chapter_id').references(() => creativeChapters.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => creativeProjects.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  narrationText: text('narration_text').notNull(),
  visualPrompt: text('visual_prompt'),
  assignedMediaAssetId: uuid('assigned_media_asset_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
  durationSeconds: numeric('duration_seconds', { precision: 5, scale: 2 }).notNull().default('5.00'),
});

export const creativeJobs = pgTable('creative_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => creativeProjects.id, { onDelete: 'cascade' }),
  videoProvider: text('video_provider').notNull().default('WAN21'), // WAN21, LTX, HUNYUAN, CLOUD
  ttsVoice: text('tts_voice').notNull().default('en_US-lessac-medium'),
  status: creativeJobStatusEnum('status').notNull().default('QUEUED'),
  progressPercent: integer('progress_percent').notNull().default(0),
  outputUrl: text('output_url'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// ==========================================
// 11. AUDIT LOGS, WEBHOOKS & BACKUPS
// ==========================================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  riskLevel: actionRiskEnum('risk_level').notNull().default('READ'),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  actionCreatedIdx: index('audit_logs_action_created_idx').on(t.action, t.createdAt),
}));

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(), // WebXPay, PayHere, Stripe, WhatsApp
  providerEventId: text('provider_event_id').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('PENDING'), // PENDING, PROCESSED, FAILED
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  provEventIdx: uniqueIndex('webhook_events_prov_event_idx').on(t.provider, t.providerEventId),
}));

export const backupRecords = pgTable('backup_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  backupType: text('backup_type').notNull().default('FULL'), // FULL, DATABASE_ONLY, MEDIA_ONLY
  fileUrl: text('file_url').notNull(),
  sizeBytes: integer('size_bytes'),
  checksum: text('checksum'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// 12. VERTICAL MODULES (W5-06)
// ==========================================

export const repairJobs = pgTable('repair_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobNumber: text('job_number').notNull().unique(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerAddress: text('customer_address'),
  deviceModel: text('device_model').notNull(),
  primaryFault: text('primary_fault'),
  inspectionRemarks: text('inspection_remarks'),
  checklistJson: jsonb('checklist_json').$type<Record<string, unknown>>().notNull().default({}),
  lockType: text('lock_type'),
  partsDescription: text('parts_description'),
  partsAmount: numeric('parts_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  serviceCharge: numeric('service_charge', { precision: 12, scale: 2 }).notNull().default('0.00'),
  advancePaid: numeric('advance_paid', { precision: 12, scale: 2 }).notNull().default('0.00'),
  technician: text('technician'),
  commissionPct: numeric('commission_pct', { precision: 5, scale: 2 }).notNull().default('0.00'),
  status: text('status').notNull().default('INTAKE'), // INTAKE, IN_PROGRESS, READY, DELIVERED, CANCELLED
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('repair_jobs_status_idx').on(t.status),
}));

export const diningTables = pgTable('dining_tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  capacity: integer('capacity').notNull().default(4),
  status: text('status').notNull().default('VACANT'), // VACANT, SEATED, ORDERED, SERVED
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kitchenTickets = pgTable('kitchen_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  kotNumber: text('kot_number').notNull().unique(),
  tableId: uuid('table_id').references(() => diningTables.id, { onDelete: 'set null' }),
  waiterName: text('waiter_name'),
  itemsJson: jsonb('items_json')
    .$type<Array<{ name: string; qty: number; notes?: string; price: number }>>()
    .notNull()
    .default([]),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  status: text('status').notNull().default('OPEN'), // OPEN, FIRED, SERVED, CLOSED, VOID
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (t) => ({
  tableIdx: index('kitchen_tickets_table_idx').on(t.tableId),
}));

export const hirePurchaseContracts = pgTable('hire_purchase_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractNumber: text('contract_number').notNull().unique(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  customerName: text('customer_name').notNull(),
  nicNumber: text('nic_number').notNull(),
  phone: text('phone').notNull(),
  itemName: text('item_name').notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  totalCashPrice: numeric('total_cash_price', { precision: 12, scale: 2 }).notNull(),
  downPayment: numeric('down_payment', { precision: 12, scale: 2 }).notNull().default('0.00'),
  monthlyEmi: numeric('monthly_emi', { precision: 12, scale: 2 }).notNull(),
  totalMonths: integer('total_months').notNull(),
  paidMonths: integer('paid_months').notNull().default(0),
  nextDueDate: timestamp('next_due_date', { withTimezone: true }),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, SETTLED, OVERDUE, CANCELLED
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('hp_contracts_status_idx').on(t.status),
}));

export const hirePurchaseInstallments = pgTable('hire_purchase_installments', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').notNull().references(() => hirePurchaseContracts.id, { onDelete: 'cascade' }),
  installmentNumber: integer('installment_number').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
  method: text('method').notNull().default('CASH'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
}, (t) => ({
  contractIdx: index('hp_installments_contract_idx').on(t.contractId),
}));

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  service: text('service').notNull(),
  specialist: text('specialist'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  fee: numeric('fee', { precision: 12, scale: 2 }).notNull().default('0.00'),
  status: text('status').notNull().default('CONFIRMED'), // CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  startsIdx: index('appointments_starts_idx').on(t.startsAt),
}));

export const loyaltyMembers = pgTable('loyalty_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  points: integer('points').notNull().default(0),
  tier: text('tier').notNull().default('SILVER'), // SILVER, GOLD, PLATINUM
  totalSpent: numeric('total_spent', { precision: 12, scale: 2 }).notNull().default('0.00'),
  lastVisitAt: timestamp('last_visit_at', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const loyaltyTransactions = pgTable('loyalty_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => loyaltyMembers.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // EARN, REDEEM, ADJUST
  pointsDelta: integer('points_delta').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  memberIdx: index('loyalty_tx_member_idx').on(t.memberId),
}));
