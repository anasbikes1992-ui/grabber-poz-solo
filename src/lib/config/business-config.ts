/**
 * GRABBER BUSINESS OS — VERTICAL CONFIGURATION & SETUP SCHEMA
 * Dynamic JSON Schema for Multi-Industry Headroom & Feature Flags
 */

import { z } from 'zod';

export const BusinessVerticalEnum = z.enum([
  'FASHION',
  'GROCERY',
  'ELECTRONICS',
  'RESTAURANT',
  'SERVICES',
  'WHOLESALE',
  'OTHER',
]);

export type BusinessVertical = z.infer<typeof BusinessVerticalEnum>;

export const BusinessConfigSchema = z.object({
  vertical: BusinessVerticalEnum.default('FASHION'),
  businessName: z.string().min(1, 'Business name is required'),
  currency: z.string().default('LKR'),
  timezone: z.string().default('Asia/Colombo'),
  features: z.object({
    variants: z.object({
      enabled: z.boolean().default(true),
      dimensions: z.array(z.string()).default(['Size', 'Color']),
    }),
    serialNumbers: z.object({
      enabled: z.boolean().default(false),
    }),
    tableService: z.object({
      enabled: z.boolean().default(false),
      tablesCount: z.number().default(0),
    }),
    kitchenOrders: z.object({
      enabled: z.boolean().default(false),
      kdsDisplay: z.boolean().default(false),
    }),
    modifiers: z.object({
      enabled: z.boolean().default(false),
    }),
    creditSalesPolimPotha: z.object({
      enabled: z.boolean().default(true),
      defaultCreditLimit: z.number().default(50000),
    }),
    deliveryTracking: z.object({
      enabled: z.boolean().default(true),
    }),
    barcodes: z.object({
      autoGenerate: z.boolean().default(true),
      format: z.enum(['EAN13', 'CODE128']).default('EAN13'),
    }),
  }),
});

export type BusinessConfig = z.infer<typeof BusinessConfigSchema>;

export const DEFAULT_CONFIGS: Record<BusinessVertical, Partial<BusinessConfig>> = {
  FASHION: {
    vertical: 'FASHION',
    features: {
      variants: { enabled: true, dimensions: ['Size', 'Color'] },
      serialNumbers: { enabled: false },
      tableService: { enabled: false, tablesCount: 0 },
      kitchenOrders: { enabled: false, kdsDisplay: false },
      modifiers: { enabled: false },
      creditSalesPolimPotha: { enabled: true, defaultCreditLimit: 50000 },
      deliveryTracking: { enabled: true },
      barcodes: { autoGenerate: true, format: 'EAN13' },
    },
  },
  GROCERY: {
    vertical: 'GROCERY',
    features: {
      variants: { enabled: false, dimensions: [] },
      serialNumbers: { enabled: false },
      tableService: { enabled: false, tablesCount: 0 },
      kitchenOrders: { enabled: false, kdsDisplay: false },
      modifiers: { enabled: false },
      creditSalesPolimPotha: { enabled: true, defaultCreditLimit: 25000 },
      deliveryTracking: { enabled: true },
      barcodes: { autoGenerate: true, format: 'EAN13' },
    },
  },
  ELECTRONICS: {
    vertical: 'ELECTRONICS',
    features: {
      variants: { enabled: true, dimensions: ['Storage', 'Color'] },
      serialNumbers: { enabled: true },
      tableService: { enabled: false, tablesCount: 0 },
      kitchenOrders: { enabled: false, kdsDisplay: false },
      modifiers: { enabled: false },
      creditSalesPolimPotha: { enabled: true, defaultCreditLimit: 100000 },
      deliveryTracking: { enabled: true },
      barcodes: { autoGenerate: true, format: 'CODE128' },
    },
  },
  RESTAURANT: {
    vertical: 'RESTAURANT',
    features: {
      variants: { enabled: false, dimensions: [] },
      serialNumbers: { enabled: false },
      tableService: { enabled: true, tablesCount: 20 },
      kitchenOrders: { enabled: true, kdsDisplay: true },
      modifiers: { enabled: true },
      creditSalesPolimPotha: { enabled: false, defaultCreditLimit: 0 },
      deliveryTracking: { enabled: true },
      barcodes: { autoGenerate: false, format: 'EAN13' },
    },
  },
  SERVICES: {
    vertical: 'SERVICES',
    features: {
      variants: { enabled: false, dimensions: [] },
      serialNumbers: { enabled: false },
      tableService: { enabled: false, tablesCount: 0 },
      kitchenOrders: { enabled: false, kdsDisplay: false },
      modifiers: { enabled: false },
      creditSalesPolimPotha: { enabled: true, defaultCreditLimit: 30000 },
      deliveryTracking: { enabled: false },
      barcodes: { autoGenerate: false, format: 'EAN13' },
    },
  },
  WHOLESALE: {
    vertical: 'WHOLESALE',
    features: {
      variants: { enabled: true, dimensions: ['Pack Size', 'Grade'] },
      serialNumbers: { enabled: false },
      tableService: { enabled: false, tablesCount: 0 },
      kitchenOrders: { enabled: false, kdsDisplay: false },
      modifiers: { enabled: false },
      creditSalesPolimPotha: { enabled: true, defaultCreditLimit: 250000 },
      deliveryTracking: { enabled: true },
      barcodes: { autoGenerate: true, format: 'CODE128' },
    },
  },
  OTHER: {
    vertical: 'OTHER',
    features: {
      variants: { enabled: true, dimensions: ['Variant'] },
      serialNumbers: { enabled: false },
      tableService: { enabled: false, tablesCount: 0 },
      kitchenOrders: { enabled: false, kdsDisplay: false },
      modifiers: { enabled: false },
      creditSalesPolimPotha: { enabled: true, defaultCreditLimit: 50000 },
      deliveryTracking: { enabled: true },
      barcodes: { autoGenerate: true, format: 'EAN13' },
    },
  },
};
