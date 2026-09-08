import type { VerticalPack } from '../types';

export const ELECTRONICS_PACK: VerticalPack = {
  id: 'ELECTRONICS',
  name: 'Electronics & Mobile Repair',
  tagline: 'Serialized IMEI tracking, warranty claims, repair tickets, and high-ticket accessory cross-sells.',
  icon: 'Smartphone',
  kpiWeightings: {
    salesWeight: 25,
    inventoryWeight: 20,
    profitWeight: 20,
    customerWeight: 15,
    seoWeight: 10,
    operationsWeight: 10,
  },
  inventoryRules: {
    defaultLeadTimeDays: 7,
    safetyStockDays: 14,
    deadStockThresholdDays: 45,
    enableBatchExpiryTracking: false,
    enableSerializedTracking: true,
  },
  seoTemplates: {
    titlePattern: '{{productName}} Price in Sri Lanka — Genuine Warranty | {{storeName}}',
    metaDescriptionPattern: 'Get genuine {{productName}} with company warranty in Sri Lanka. Fast delivery, doorstep repair, and best prices at {{storeName}}.',
    defaultSchemaType: 'Product',
    primaryKeywords: ['phone prices Sri Lanka', 'phone repair Colombo', 'original phone accessories', 'apple samsung genuine'],
  },
  marketingAngles: [
    'Trade-In Old Device for Cash / Upgrade',
    'Free Screen Guard with Phone Purchase',
    'Same-Day Battery & Display Replacement Promo',
    'Original Tech Accessories 20% Off',
  ],
  keyPerformanceIndicators: [
    { id: 'ACCESSORY_ATTACH_RATE', name: 'Accessories Attachment Ratio', description: 'Cases/chargers sold per phone purchase', targetBenchmark: '> 1.8 units' },
    { id: 'REPAIR_TURNAROUND_HOURS', name: 'Average Repair Turnaround', description: 'Hours from device check-in to ready-for-pickup', targetBenchmark: '< 24 hours' },
    { id: 'WARRANTY_CLAIM_RATE', name: 'Warranty Return Rate', description: 'Percentage of devices returned under defect warranty', targetBenchmark: '< 1.5%' },
  ],
  jarvisPromptContext: 'You are Jarvis specialized for an Electronics & Mobile Repair shop. Prioritize serialized inventory accuracy, repair ticket throughput, accessory attachments, and trade-in valuations.',
};
