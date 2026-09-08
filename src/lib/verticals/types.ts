/**
 * GRABBER BUSINESS OS — VERTICAL INTELLIGENCE PACKS (TYPES)
 * Domain-specific parameters, KPIs, inventory rules, SEO templates, and prompt contexts.
 */

export type VerticalType =
  | 'GENERAL_RETAIL'
  | 'GROCERY'
  | 'FASHION'
  | 'ELECTRONICS'
  | 'RESTAURANT'
  | 'HARDWARE'
  | 'PHARMACY'
  | 'BEAUTY'
  | 'AUTOPARTS'
  | 'WHOLESALE';

export interface VerticalKpiWeighting {
  salesWeight: number;
  inventoryWeight: number;
  profitWeight: number;
  customerWeight: number;
  seoWeight: number;
  operationsWeight: number;
}

export interface VerticalInventoryRules {
  defaultLeadTimeDays: number;
  safetyStockDays: number;
  deadStockThresholdDays: number;
  enableBatchExpiryTracking: boolean;
  enableSerializedTracking: boolean;
}

export interface VerticalSeoTemplate {
  titlePattern: string;
  metaDescriptionPattern: string;
  defaultSchemaType: 'Product' | 'LocalBusiness' | 'Restaurant' | 'Store' | 'MedicalBusiness';
  primaryKeywords: string[];
}

export interface VerticalPack {
  id: VerticalType;
  name: string;
  tagline: string;
  icon: string;
  kpiWeightings: VerticalKpiWeighting;
  inventoryRules: VerticalInventoryRules;
  seoTemplates: VerticalSeoTemplate;
  marketingAngles: string[];
  keyPerformanceIndicators: Array<{
    id: string;
    name: string;
    description: string;
    targetBenchmark: string;
  }>;
  jarvisPromptContext: string;
}
