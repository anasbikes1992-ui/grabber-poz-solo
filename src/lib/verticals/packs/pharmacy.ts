import type { VerticalPack } from '../types';

export const PHARMACY_PACK: VerticalPack = {
  id: 'PHARMACY',
  name: 'Pharmacy & Healthcare',
  tagline: 'Prescription integrity, pharmacist gates, and FEFO medicine lots.',
  icon: 'Pill',
  kpiWeightings: {
    salesWeight: 25,
    inventoryWeight: 35,
    profitWeight: 15,
    customerWeight: 10,
    seoWeight: 5,
    operationsWeight: 10,
  },
  inventoryRules: {
    defaultLeadTimeDays: 3,
    safetyStockDays: 7,
    deadStockThresholdDays: 30,
    enableBatchExpiryTracking: true,
    enableSerializedTracking: false,
  },
  seoTemplates: {
    titlePattern: '{{productName}} — Licensed Pharmacy at {{storeName}}',
    metaDescriptionPattern: 'Order {{productName}} from {{storeName}}. Pharmacist-approved dispensing in Sri Lanka.',
    defaultSchemaType: 'MedicalBusiness',
    primaryKeywords: ['pharmacy', 'prescription', 'medicine', 'chemist Sri Lanka'],
  },
  marketingAngles: [
    'Chronic care refill reminder',
    'OTC wellness bundle',
    'Near-expiry controlled markdown (pharmacy policy)',
  ],
  keyPerformanceIndicators: [
    { id: 'RX_PENDING', name: 'Prescriptions awaiting approval', description: 'Draft/pending Rx queue', targetBenchmark: '< 5 open' },
    { id: 'RX_TURNAROUND', name: 'Approve-to-dispense time', description: 'Median hours', targetBenchmark: '< 2h' },
  ],
  jarvisPromptContext:
    'You are Jarvis for a licensed pharmacy. Never skip pharmacist approval. Focus on Rx queue, FEFO lots, and controlled dispense.',
};
