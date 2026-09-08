import type { VerticalPack } from '../types';

export const GENERAL_RETAIL_PACK: VerticalPack = {
  id: 'GENERAL_RETAIL',
  name: 'General Retail & Multi-Product Store',
  tagline: 'Omnichannel commerce, customer loyalty, balanced turnover, and margin protection.',
  icon: 'Store',
  kpiWeightings: {
    salesWeight: 25,
    inventoryWeight: 20,
    profitWeight: 20,
    customerWeight: 15,
    seoWeight: 10,
    operationsWeight: 10,
  },
  inventoryRules: {
    defaultLeadTimeDays: 5,
    safetyStockDays: 10,
    deadStockThresholdDays: 45,
    enableBatchExpiryTracking: false,
    enableSerializedTracking: false,
  },
  seoTemplates: {
    titlePattern: 'Buy {{productName}} Online in Sri Lanka — {{storeName}}',
    metaDescriptionPattern: 'Order {{productName}} online at best prices in Sri Lanka. Fast doorstep delivery, cash on delivery, and genuine products from {{storeName}}.',
    defaultSchemaType: 'Product',
    primaryKeywords: ['buy online Sri Lanka', 'cash on delivery shop', 'best online shopping Colombo', 'genuine products Sri Lanka'],
  },
  marketingAngles: [
    'Seasonal Super Saver Discounts',
    'Buy 1 Get 1 on Selected Categories',
    'Customer Appreciation Month Specials',
    'Weekend Flash Sale across Top SKUs',
  ],
  keyPerformanceIndicators: [
    { id: 'OMNICHANNEL_CONVERSION', name: 'Storefront & POS Order Velocity', description: 'Total transactions per day across all channels', targetBenchmark: '> 50 orders' },
    { id: 'AVERAGE_GROSS_MARGIN', name: 'Blended Gross Margin', description: 'Overall margin across all product departments', targetBenchmark: '> 32%' },
    { id: 'STOCKOUT_RISK_RATIO', name: 'Low Stock SKU Percentage', description: 'Percentage of active items below reorder point', targetBenchmark: '< 5%' },
  ],
  jarvisPromptContext: 'You are Jarvis specialized for a General Retail commerce business. Focus on balanced inventory turnover, customer retention, cross-selling, and gross margin optimization.',
};
