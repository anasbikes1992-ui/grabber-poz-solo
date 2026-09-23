import type { VerticalPack } from '../types';

export const RENTAL_PACK: VerticalPack = {
  id: 'RENTAL',
  name: 'Equipment Rental',
  tagline: 'Asset availability, deposits, and contract return discipline.',
  icon: 'CalendarClock',
  kpiWeightings: {
    salesWeight: 30,
    inventoryWeight: 25,
    profitWeight: 20,
    customerWeight: 10,
    seoWeight: 5,
    operationsWeight: 10,
  },
  inventoryRules: {
    defaultLeadTimeDays: 5,
    safetyStockDays: 2,
    deadStockThresholdDays: 90,
    enableBatchExpiryTracking: false,
    enableSerializedTracking: true,
  },
  seoTemplates: {
    titlePattern: 'Rent {{productName}} in Sri Lanka — {{storeName}}',
    metaDescriptionPattern: 'Hire {{productName}} with deposit protection from {{storeName}}.',
    defaultSchemaType: 'LocalBusiness',
    primaryKeywords: ['equipment rental', 'tool hire', 'rent generator', 'camera hire'],
  },
  marketingAngles: [
    'Weekend event hire package',
    'Deposit-secured long-term lease',
    'Maintenance-ready fleet promo',
  ],
  keyPerformanceIndicators: [
    { id: 'UTILIZATION', name: 'Asset utilization %', description: 'RENTED / total active assets', targetBenchmark: '> 60%' },
    { id: 'OVERDUE_RETURNS', name: 'Overdue contracts', description: 'ACTIVE past end date', targetBenchmark: '0' },
  ],
  jarvisPromptContext:
    'You are Jarvis for an equipment rental business. Track asset status, deposits, and overdue returns.',
};
