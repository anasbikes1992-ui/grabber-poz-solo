import type { VerticalPack } from '../types';

export const JEWELRY_PACK: VerticalPack = {
  id: 'JEWELRY',
  name: 'Jewelry & Watches',
  tagline: 'Serialized high-value stock, certificates, showroom appointments, and slow-moving luxury inventory control.',
  icon: 'Gem',
  kpiWeightings: {
    salesWeight: 20,
    inventoryWeight: 25,
    profitWeight: 25,
    customerWeight: 15,
    seoWeight: 10,
    operationsWeight: 5,
  },
  inventoryRules: {
    defaultLeadTimeDays: 21,
    safetyStockDays: 30,
    deadStockThresholdDays: 120,
    enableBatchExpiryTracking: false,
    enableSerializedTracking: true,
  },
  seoTemplates: {
    titlePattern: '{{productName}} - Fine Jewelry & Watches in Sri Lanka | {{storeName}}',
    metaDescriptionPattern: 'Shop {{productName}} from {{storeName}} with live availability, secure handover, and certificate-ready service.',
    defaultSchemaType: 'Product',
    primaryKeywords: ['jewelry Sri Lanka', 'watches Colombo', 'gold jewelry online', 'gemstone rings Sri Lanka'],
  },
  marketingAngles: [
    'Certificate-Ready Fine Jewelry Showcase',
    'Wedding & Engagement Collection',
    'Watch Service and Strap Upgrade Week',
    'VIP Appointment and Secure Handover',
  ],
  keyPerformanceIndicators: [
    { id: 'HIGH_VALUE_STOCK_EXPOSURE', name: 'High-Value Stock Exposure', description: 'Total value of serialized jewelry and watch inventory on hand', targetBenchmark: 'Reviewed weekly' },
    { id: 'CERTIFICATE_COMPLETENESS', name: 'Certificate Completeness', description: 'Share of high-value SKUs with certificate or appraisal notes', targetBenchmark: '> 95%' },
    { id: 'LUXURY_STOCK_TURN', name: 'Luxury Stock Turn', description: 'Sell-through speed for pieces older than 120 days', targetBenchmark: 'Improving month over month' },
  ],
  jarvisPromptContext: 'You are Jarvis specialized for a Jewelry & Watches retailer. Focus on high-value serialized inventory, certificate completeness, VIP customer follow-up, margin protection, and slow-moving luxury stock.',
};
