import type { VerticalPack } from '../types';

export const HARDWARE_PACK: VerticalPack = {
  id: 'HARDWARE',
  name: 'Hardware & Building Supplies',
  tagline: 'Contractor credit ledger, bulk quantity purchasing, weight/dimension stock, and supplier price consistency.',
  icon: 'Wrench',
  kpiWeightings: {
    salesWeight: 20,
    inventoryWeight: 25,
    profitWeight: 20,
    customerWeight: 15,
    seoWeight: 5,
    operationsWeight: 15,
  },
  inventoryRules: {
    defaultLeadTimeDays: 7,
    safetyStockDays: 14,
    deadStockThresholdDays: 90,
    enableBatchExpiryTracking: false,
    enableSerializedTracking: false,
  },
  seoTemplates: {
    titlePattern: 'Buy {{productName}} in Bulk — Hardware & Building Supplies | {{storeName}}',
    metaDescriptionPattern: 'Top quality {{productName}} at wholesale prices. Construction materials, tools, and site delivery in Sri Lanka from {{storeName}}.',
    defaultSchemaType: 'Store',
    primaryKeywords: ['hardware store Colombo', 'building materials Sri Lanka', 'power tools online', 'cement paint steel prices'],
  },
  marketingAngles: [
    'Contractor Bulk Order Discounts',
    'Rainy Season Waterproofing Materials Promo',
    'Power Tools Clearance & Trade-In',
    'Special Quotation on Site Deliveries',
  ],
  keyPerformanceIndicators: [
    { id: 'CONTRACTOR_CREDIT_AGING', name: 'Contractor Debt >30 Days', description: 'Total outstanding contractor balance past term', targetBenchmark: '< LKR 100,000' },
    { id: 'BULK_DISCOUNT_MARGIN', name: 'Bulk Order Net Margin', description: 'Margin realized on high-volume builder orders', targetBenchmark: '> 18%' },
    { id: 'SUPPLIER_PRICE_VARIANCE', name: 'Raw Material Cost Inflation', description: 'Price fluctuation from steel/cement suppliers', targetBenchmark: '< 5%' },
  ],
  jarvisPromptContext: 'You are Jarvis specialized for a Hardware & Building Supplies store. Focus on contractor credit exposure, bulk order margins, supplier price fluctuation, and heavy goods logistics.',
};
