/**
 * GRABBER BUSINESS OS — PROMOTION DOMAIN TYPES (M5)
 * Defines the canonical contract for promotions, eligibility, and redemptions.
 */

export type PromotionStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'EXPIRED'
  | 'EXHAUSTED'
  | 'ARCHIVED';

export type PromotionType =
  | 'PERCENTAGE'
  | 'FIXED_AMOUNT'
  | 'MIN_ORDER'
  | 'CATEGORY'
  | 'BRAND'
  | 'PRODUCT'
  | 'FIRST_ORDER';

export type DiscountType = 'PERCENT' | 'FIXED';

export type StackingPolicy = 'NONE' | 'BEST_PROMOTION' | 'STACK_ALLOWED';

export interface PromotionEligibility {
  productIds?: string[];
  variantIds?: string[];
  categoryIds?: string[];
  brandNames?: string[];
  branchIds?: string[];
  customerSegments?: string[];
  firstOrderOnly?: boolean;
}

export interface PromotionDisplayConfig {
  popupEnabled: boolean;
  bannerEnabled: boolean;
  popupTitle?: string;
  popupMessage?: string;
  popupImage?: string;
  popupCtaText?: string;
  popupCtaUrl?: string;
  announcementEnabled: boolean;
  announcementText?: string;
  countdownEnabled: boolean;
}

export interface PromotionRule {
  id: string;
  name: string;
  description?: string;
  status: PromotionStatus;
  promotionType: PromotionType;
  discountType: DiscountType;
  discountValue: number; // e.g. 15 for 15% or 500 for LKR 500
  startsAt: string; // ISO date-time string
  endsAt: string; // ISO date-time string
  isAutomatic: boolean;
  promoCode?: string; // Upper-case normalized code, e.g. "SUMMER15"
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  usageLimit?: number; // Total max global redemptions
  usageCount: number;
  perCustomerLimit?: number; // Max redemptions per customer/phone
  eligibility?: PromotionEligibility;
  stackingPolicy: StackingPolicy;
  priority: number; // Higher number evaluated first
  display?: PromotionDisplayConfig;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItemEvaluationInput {
  productId: string;
  variantId?: string;
  categoryId?: string;
  brandName?: string;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
}

export interface CartEvaluationInput {
  subtotal: number;
  items: CartItemEvaluationInput[];
  channel?: 'POS' | 'STOREFRONT' | 'WHATSAPP' | 'MANUAL' | 'API';
  branchId?: string;
  customerId?: string;
  customerPhone?: string;
  customerSegment?: string;
  isFirstOrder?: boolean;
  promoCode?: string;
}

export interface PromotionEvaluationResult {
  valid: boolean;
  code?: string;
  promotionId?: string;
  promotionName?: string;
  discountTotal: number;
  discountType?: DiscountType;
  discountValue?: number;
  isAutomatic?: boolean;
  appliedRule?: PromotionRule;
  qualifyingItemIds?: string[];
  error?: string;
  errorCode?:
    | 'NO_PROMO_CODE'
    | 'PROMO_NOT_FOUND'
    | 'PROMO_INACTIVE'
    | 'PROMO_NOT_STARTED'
    | 'PROMO_EXPIRED'
    | 'USAGE_LIMIT_REACHED'
    | 'CUSTOMER_LIMIT_REACHED'
    | 'FIRST_ORDER_REQUIRED'
    | 'MINIMUM_ORDER_NOT_MET'
    | 'NO_ELIGIBLE_ITEMS'
    | 'BRANCH_NOT_ELIGIBLE';
}

export interface PromotionRedemptionRecord {
  id: string;
  promotionId: string;
  orderId: string;
  customerId?: string;
  customerPhone?: string;
  promoCode?: string;
  discountAmount: number;
  redeemedAt: string;
}
