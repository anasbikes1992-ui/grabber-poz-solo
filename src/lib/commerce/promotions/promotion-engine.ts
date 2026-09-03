/**
 * GRABBER BUSINESS OS — PROMOTION EVALUATION ENGINE (M5)
 * Server-authoritative evaluation enforcing PI-001 through PI-012.
 */

import type {
  PromotionRule,
  CartEvaluationInput,
  PromotionEvaluationResult,
  CartItemEvaluationInput,
} from './types';

export function isPromotionActive(rule: PromotionRule, asOfDate = new Date().toISOString()): {
  active: boolean;
  errorCode?: PromotionEvaluationResult['errorCode'];
  error?: string;
} {
  if (rule.status !== 'ACTIVE') {
    return { active: false, errorCode: 'PROMO_INACTIVE', error: 'Promotion is not currently active' };
  }

  if (rule.startsAt && asOfDate < rule.startsAt) {
    return { active: false, errorCode: 'PROMO_NOT_STARTED', error: 'Promotion has not started yet' };
  }

  if (rule.endsAt && asOfDate > rule.endsAt) {
    return { active: false, errorCode: 'PROMO_EXPIRED', error: 'Promotion has expired' };
  }

  if (rule.usageLimit != null && rule.usageCount >= rule.usageLimit) {
    return { active: false, errorCode: 'USAGE_LIMIT_REACHED', error: 'Promotion usage limit has been reached' };
  }

  return { active: true };
}

export function evaluateSinglePromotion(
  rule: PromotionRule,
  cart: CartEvaluationInput,
  asOfDate = new Date().toISOString(),
): PromotionEvaluationResult {
  // 1. Check active status and date bounds
  const activeCheck = isPromotionActive(rule, asOfDate);
  if (!activeCheck.active) {
    return {
      valid: false,
      code: rule.promoCode,
      promotionId: rule.id,
      promotionName: rule.name,
      discountTotal: 0,
      error: activeCheck.error,
      errorCode: activeCheck.errorCode,
    };
  }

  // 2. Branch eligibility
  if (rule.eligibility?.branchIds?.length && cart.branchId) {
    if (!rule.eligibility.branchIds.includes(cart.branchId)) {
      return {
        valid: false,
        code: rule.promoCode,
        promotionId: rule.id,
        promotionName: rule.name,
        discountTotal: 0,
        error: 'Promotion is not valid at this store branch',
        errorCode: 'BRANCH_NOT_ELIGIBLE',
      };
    }
  }

  // 3. Customer segment eligibility
  if (rule.eligibility?.customerSegments?.length && cart.customerSegment) {
    const matched = rule.eligibility.customerSegments.some(
      (s) => s.toUpperCase() === cart.customerSegment?.toUpperCase(),
    );
    if (!matched) {
      return {
        valid: false,
        code: rule.promoCode,
        promotionId: rule.id,
        promotionName: rule.name,
        discountTotal: 0,
        error: 'Customer is not eligible for this promotion segment',
        errorCode: 'CUSTOMER_LIMIT_REACHED',
      };
    }
  }

  // 4. First order only requirement
  if (rule.eligibility?.firstOrderOnly || rule.promotionType === 'FIRST_ORDER') {
    if (cart.isFirstOrder === false) {
      return {
        valid: false,
        code: rule.promoCode,
        promotionId: rule.id,
        promotionName: rule.name,
        discountTotal: 0,
        error: 'Promotion is valid for first-time customers only',
        errorCode: 'FIRST_ORDER_REQUIRED',
      };
    }
  }

  // 5. Minimum order spend
  const minSpend = rule.minimumOrderAmount ?? 0;
  if (cart.subtotal < minSpend) {
    return {
      valid: false,
      code: rule.promoCode,
      promotionId: rule.id,
      promotionName: rule.name,
      discountTotal: 0,
      error: `Minimum order spend of LKR ${minSpend.toLocaleString()} required`,
      errorCode: 'MINIMUM_ORDER_NOT_MET',
    };
  }

  // 6. Item eligibility scoping
  const eligibleItems: CartItemEvaluationInput[] = [];
  const elig = rule.eligibility;

  for (const item of cart.items) {
    let isItemEligible = true;

    if (elig?.productIds?.length && !elig.productIds.includes(item.productId)) {
      isItemEligible = false;
    }
    if (elig?.variantIds?.length && (!item.variantId || !elig.variantIds.includes(item.variantId))) {
      isItemEligible = false;
    }
    if (elig?.categoryIds?.length && (!item.categoryId || !elig.categoryIds.includes(item.categoryId))) {
      isItemEligible = false;
    }
    if (elig?.brandNames?.length && (!item.brandName || !elig.brandNames.map((b) => b.toUpperCase()).includes(item.brandName.toUpperCase()))) {
      isItemEligible = false;
    }

    if (isItemEligible) {
      eligibleItems.push(item);
    }
  }

  if (eligibleItems.length === 0 && (elig?.productIds?.length || elig?.categoryIds?.length || elig?.brandNames?.length)) {
    return {
      valid: false,
      code: rule.promoCode,
      promotionId: rule.id,
      promotionName: rule.name,
      discountTotal: 0,
      error: 'No qualifying items found in cart for this promotion',
      errorCode: 'NO_ELIGIBLE_ITEMS',
    };
  }

  // 7. Calculate discount on qualifying items
  const qualifyingSubtotal =
    eligibleItems.length > 0 && (elig?.productIds?.length || elig?.categoryIds?.length || elig?.brandNames?.length)
      ? eligibleItems.reduce((sum, item) => sum + item.lineSubtotal, 0)
      : cart.subtotal;

  let calculatedDiscount = 0;
  if (rule.discountType === 'PERCENT') {
    calculatedDiscount = Math.round(qualifyingSubtotal * (rule.discountValue / 100) * 100) / 100;
  } else {
    calculatedDiscount = Math.min(qualifyingSubtotal, rule.discountValue);
  }

  // 8. Enforce maximum discount cap
  if (rule.maximumDiscountAmount != null && calculatedDiscount > rule.maximumDiscountAmount) {
    calculatedDiscount = rule.maximumDiscountAmount;
  }

  // PI-004 & PI-012: bounded by [0, qualifyingSubtotal]
  const finalDiscount = Math.max(0, Math.min(qualifyingSubtotal, calculatedDiscount));

  return {
    valid: true,
    code: rule.promoCode,
    promotionId: rule.id,
    promotionName: rule.name,
    discountTotal: finalDiscount,
    discountType: rule.discountType,
    discountValue: rule.discountValue,
    isAutomatic: rule.isAutomatic,
    appliedRule: rule,
    qualifyingItemIds: eligibleItems.map((i) => i.productId),
  };
}

export function evaluatePromoCode(
  rules: PromotionRule[],
  promoCode: string | undefined | null,
  cart: CartEvaluationInput,
  asOfDate = new Date().toISOString(),
): PromotionEvaluationResult {
  if (!promoCode || !promoCode.trim()) {
    return { valid: false, discountTotal: 0, errorCode: 'NO_PROMO_CODE', error: 'Promo code is required' };
  }

  const normalized = promoCode.trim().toUpperCase();
  const rule = rules.find((r) => r.promoCode && r.promoCode.toUpperCase() === normalized);

  if (!rule) {
    return {
      valid: false,
      code: normalized,
      discountTotal: 0,
      errorCode: 'PROMO_NOT_FOUND',
      error: `Promo code "${normalized}" is invalid`,
    };
  }

  return evaluateSinglePromotion(rule, cart, asOfDate);
}

export function evaluateAutoPromotions(
  rules: PromotionRule[],
  cart: CartEvaluationInput,
  asOfDate = new Date().toISOString(),
): PromotionEvaluationResult {
  const autoRules = rules.filter((r) => r.isAutomatic);

  let bestResult: PromotionEvaluationResult = {
    valid: false,
    discountTotal: 0,
  };

  for (const rule of autoRules) {
    const result = evaluateSinglePromotion(rule, cart, asOfDate);
    if (result.valid && result.discountTotal > bestResult.discountTotal) {
      bestResult = result;
    }
  }

  return bestResult;
}

export function resolveCartPromotions(
  rules: PromotionRule[],
  cart: CartEvaluationInput,
  asOfDate = new Date().toISOString(),
): {
  codeResult?: PromotionEvaluationResult;
  autoResult?: PromotionEvaluationResult;
  bestResult: PromotionEvaluationResult;
} {
  const autoResult = evaluateAutoPromotions(rules, cart, asOfDate);
  let codeResult: PromotionEvaluationResult | undefined;

  if (cart.promoCode?.trim()) {
    codeResult = evaluatePromoCode(rules, cart.promoCode, cart, asOfDate);
  }

  // Stacking resolution: default BEST_PROMOTION
  let bestResult: PromotionEvaluationResult = { valid: false, discountTotal: 0 };

  if (codeResult && codeResult.valid && codeResult.discountTotal > 0) {
    bestResult = codeResult;
  }

  if (autoResult.valid && autoResult.discountTotal > bestResult.discountTotal) {
    bestResult = autoResult;
  }

  return {
    codeResult,
    autoResult,
    bestResult,
  };
}
