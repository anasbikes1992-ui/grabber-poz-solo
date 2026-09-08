import type { VerticalPack } from '../types';

export const GROCERY_PACK: VerticalPack = {
  id: 'GROCERY',
  name: 'Grocery & Supermarket',
  tagline: 'High turnover, expiry prevention, and rapid daily basket optimization.',
  icon: 'ShoppingCart',
  kpiWeightings: {
    salesWeight: 30,
    inventoryWeight: 35,
    profitWeight: 15,
    customerWeight: 10,
    seoWeight: 5,
    operationsWeight: 5,
  },
  inventoryRules: {
    defaultLeadTimeDays: 2,
    safetyStockDays: 4,
    deadStockThresholdDays: 14,
    enableBatchExpiryTracking: true,
    enableSerializedTracking: false,
  },
  seoTemplates: {
    titlePattern: 'Buy {{productName}} Online Sri Lanka — Best Price at {{storeName}}',
    metaDescriptionPattern: 'Order fresh {{productName}} online in Sri Lanka. Same-day grocery delivery available at {{storeName}}.',
    defaultSchemaType: 'Store',
    primaryKeywords: ['grocery delivery', 'fresh groceries', 'supermarket online', 'best price daily essentials'],
  },
  marketingAngles: [
    'Weekend Grocery Restock Special',
    'Fresh Produce Morning Arrival',
    'Bundle & Save: Daily Pantry Essentials',
    'Near-Expiry Flash Clearance (Reduce Waste)',
  ],
  keyPerformanceIndicators: [
    { id: 'EXPIRY_RISK_VALUATION', name: 'Stock Expiring Within 7 Days', description: 'Total cost of items reaching shelf life', targetBenchmark: '< LKR 5,000' },
    { id: 'DAILY_INVENTORY_TURNOVER', name: 'Daily Stock Velocity', description: 'Average units sold per active grocery SKU', targetBenchmark: '> 4.5 units/day' },
    { id: 'AVERAGE_BASKET_SIZE', name: 'Grocery Basket Size', description: 'Items per retail counter checkout', targetBenchmark: '> 4.0 items' },
  ],
  jarvisPromptContext: 'You are Jarvis specialized for a high-volume Grocery & Supermarket business. Focus on short shelf-life risk, rapid restocking, and multi-item basket size maximization.',
};
