import type { VerticalPack } from '../types';

export const FASHION_PACK: VerticalPack = {
  id: 'FASHION',
  name: 'Fashion & Apparel',
  tagline: 'Size-color variant performance, seasonal markdown curves, and trend lifecycle tracking.',
  icon: 'Shirt',
  kpiWeightings: {
    salesWeight: 25,
    inventoryWeight: 20,
    profitWeight: 25,
    customerWeight: 15,
    seoWeight: 10,
    operationsWeight: 5,
  },
  inventoryRules: {
    defaultLeadTimeDays: 14,
    safetyStockDays: 20,
    deadStockThresholdDays: 60,
    enableBatchExpiryTracking: false,
    enableSerializedTracking: false,
  },
  seoTemplates: {
    titlePattern: '{{productName}} — Trending Fashion Online Sri Lanka | {{storeName}}',
    metaDescriptionPattern: 'Shop latest {{productName}} online in Sri Lanka. Premium fabrics, perfect fit, and islandwide cash on delivery.',
    defaultSchemaType: 'Product',
    primaryKeywords: ['fashion online', 'clothing store Sri Lanka', 'trendy apparel', 'dresses online'],
  },
  marketingAngles: [
    'New Seasonal Collection Drop',
    'Weekend Lookbook & Outfit Bundles',
    'Limited Size Clearance Sale',
    'VIP Early Access to New Arrivals',
  ],
  keyPerformanceIndicators: [
    { id: 'VARIANT_SELLTHROUGH_RATE', name: 'Size-Color Sell-Through', description: 'Percentage of collection units sold within 30 days', targetBenchmark: '> 60%' },
    { id: 'SEASONAL_MARKDOWN_RATE', name: 'Discount Markdown Depth', description: 'Average discount given on end-of-season styles', targetBenchmark: '< 20%' },
    { id: 'REPEAT_FASHION_BUYER', name: 'Seasonal Repeat Buyers', description: 'Customers buying across consecutive collections', targetBenchmark: '> 30%' },
  ],
  jarvisPromptContext: 'You are Jarvis specialized for a Fashion & Apparel brand. Focus on variant sell-through (size/color distribution), seasonal freshness, markdown avoidance, and visual outfit bundling.',
};
