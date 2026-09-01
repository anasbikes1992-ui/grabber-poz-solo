/**
 * Server-side promotion / coupon rules engine (v1).
 * Rules stored in business_config.config_json.promotions.
 */

export type PromotionRule = {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSpend: number;
  usageCount: number;
  maxUsage?: number;
  validUntil: string; // ISO date YYYY-MM-DD
  active: boolean;
};

export type PromotionEvaluation = {
  valid: boolean;
  discountTotal: number;
  rule?: PromotionRule;
  error?: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function evaluatePromotion(
  rules: PromotionRule[],
  code: string | undefined | null,
  subtotal: number,
  asOfDate = todayIsoDate(),
): PromotionEvaluation {
  if (!code?.trim()) {
    return { valid: false, discountTotal: 0, error: 'No promo code provided' };
  }

  const normalized = code.trim().toUpperCase();
  const rule = rules.find((r) => r.active && r.code.toUpperCase() === normalized);

  if (!rule) {
    return { valid: false, discountTotal: 0, error: 'Invalid or inactive promo code' };
  }

  if (rule.validUntil && asOfDate > rule.validUntil) {
    return { valid: false, discountTotal: 0, error: 'Promo code has expired' };
  }

  if (rule.maxUsage != null && rule.usageCount >= rule.maxUsage) {
    return { valid: false, discountTotal: 0, error: 'Promo code usage limit reached' };
  }

  if (subtotal < rule.minSpend) {
    return {
      valid: false,
      discountTotal: 0,
      error: `Minimum order LKR ${rule.minSpend.toLocaleString()} required`,
    };
  }

  let discountTotal = 0;
  if (rule.type === 'PERCENT') {
    discountTotal = Math.round(subtotal * (rule.value / 100) * 100) / 100;
  } else {
    discountTotal = Math.min(subtotal, rule.value);
  }

  discountTotal = Math.max(0, Math.min(subtotal, discountTotal));

  return { valid: true, discountTotal, rule };
}

export function incrementPromotionUsage(rules: PromotionRule[], ruleId: string): PromotionRule[] {
  return rules.map((r) => (r.id === ruleId ? { ...r, usageCount: r.usageCount + 1 } : r));
}

export const DEFAULT_PROMOTIONS: PromotionRule[] = [
  {
    id: 'promo_welcome500',
    code: 'WELCOME500',
    type: 'FIXED',
    value: 500,
    minSpend: 4000,
    usageCount: 0,
    maxUsage: 100,
    validUntil: '2026-12-31',
    active: true,
  },
  {
    id: 'promo_summer10',
    code: 'SUMMER10',
    type: 'PERCENT',
    value: 10,
    minSpend: 5000,
    usageCount: 0,
    maxUsage: 200,
    validUntil: '2026-09-30',
    active: true,
  },
];
