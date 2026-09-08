import type { VerticalPack } from '../types';

export const RESTAURANT_PACK: VerticalPack = {
  id: 'RESTAURANT',
  name: 'Restaurant & Café / KOT',
  tagline: 'Table turnover, kitchen order ticket (KOT) speed, recipe food cost, and peak dining hours.',
  icon: 'Utensils',
  kpiWeightings: {
    salesWeight: 30,
    inventoryWeight: 15,
    profitWeight: 25,
    customerWeight: 15,
    seoWeight: 5,
    operationsWeight: 10,
  },
  inventoryRules: {
    defaultLeadTimeDays: 1,
    safetyStockDays: 2,
    deadStockThresholdDays: 5,
    enableBatchExpiryTracking: true,
    enableSerializedTracking: false,
  },
  seoTemplates: {
    titlePattern: 'Best Food & Dining in Colombo — {{storeName}} Menu & Delivery',
    metaDescriptionPattern: 'Order delicious food online from {{storeName}}. Fast delivery, dine-in table reservations, and authentic flavors.',
    defaultSchemaType: 'Restaurant',
    primaryKeywords: ['best restaurant Colombo', 'food delivery Sri Lanka', 'table reservation', 'cafe online order'],
  },
  marketingAngles: [
    'Happy Hour & Midweek Dine-In Combos',
    'Weekend Family Feast Special',
    'Chef Special Menu Item Release',
    'Free Dessert on Bills Over LKR 5,000',
  ],
  keyPerformanceIndicators: [
    { id: 'TABLE_TURNOVER_MINUTES', name: 'Average Table Seating Duration', description: 'Minutes from seating to bill settlement', targetBenchmark: '< 45 mins' },
    { id: 'FOOD_COST_PERCENTAGE', name: 'Raw Food Cost Percentage', description: 'Cost of raw ingredients vs menu price', targetBenchmark: '< 30%' },
    { id: 'KOT_PREP_TIME_MINUTES', name: 'Kitchen Order Prep Time', description: 'Minutes from KOT creation to serving', targetBenchmark: '< 15 mins' },
  ],
  jarvisPromptContext: 'You are Jarvis specialized for a Restaurant & Café. Focus on kitchen ticket speed, table turnover velocity, raw ingredient food cost control, and peak rush optimization.',
};
