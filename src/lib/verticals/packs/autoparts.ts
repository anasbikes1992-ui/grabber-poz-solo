import type { VerticalPack } from '../types';

export const AUTOPARTS_PACK: VerticalPack = {
  id: 'AUTOPARTS',
  name: 'Auto Parts & Spare Store',
  tagline: 'Make–Model–Year fitment search and OEM cross-reference.',
  icon: 'Car',
  kpiWeightings: {
    salesWeight: 30,
    inventoryWeight: 30,
    profitWeight: 20,
    customerWeight: 10,
    seoWeight: 5,
    operationsWeight: 5,
  },
  inventoryRules: {
    defaultLeadTimeDays: 7,
    safetyStockDays: 10,
    deadStockThresholdDays: 180,
    enableBatchExpiryTracking: false,
    enableSerializedTracking: false,
  },
  seoTemplates: {
    titlePattern: '{{productName}} Compatible Parts — {{storeName}}',
    metaDescriptionPattern: 'Find {{productName}} fitment by vehicle at {{storeName}}. OEM and aftermarket.',
    defaultSchemaType: 'Store',
    primaryKeywords: ['auto parts', 'spare parts', 'OEM', 'vehicle fitment Sri Lanka'],
  },
  marketingAngles: [
    'Garage wholesale price list',
    'Fast-moving brake & filter kits',
    'Fitment-guaranteed search',
  ],
  keyPerformanceIndicators: [
    { id: 'FITMENT_COVERAGE', name: 'SKUs with fitment rows', description: '% catalog linked', targetBenchmark: '> 70%' },
    { id: 'OEM_HIT_RATE', name: 'OEM search conversions', description: 'Lookups that add to cart', targetBenchmark: '> 40%' },
  ],
  jarvisPromptContext:
    'You are Jarvis for an auto-parts counter. Prioritize fitment accuracy and OEM cross-reference completeness.',
};
