/**
 * Server-side promotion / coupon rules engine (v1).
 * Rules stored in business_config.config_json.promotions.
 */

export type CartConditions = {
  minItems?: number;
  minSpend?: number;
  channels?: Array<'POS' | 'STOREFRONT' | 'WHATSAPP' | 'MANUAL' | 'API'>;
  segment?: string;
};

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
  /** IF/THEN — auto-apply when cart conditions match (no code required). */
  autoApply?: boolean;
  conditions?: CartConditions;
};

export type PromotionEvaluation = {
  valid: boolean;
  discountTotal: number;
  rule?: PromotionRule;
  error?: string;
  autoApplied?: boolean;
};

export type CartPromotionInput = {
  subtotal: number;
  itemCount: number;
  channel?: string;
  segment?: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function ruleIsExpired(rule: PromotionRule, asOfDate: string) {
  return Boolean(rule.validUntil && asOfDate > rule.validUntil);
}

function ruleUsageExceeded(rule: PromotionRule) {
  return rule.maxUsage != null && rule.usageCount >= rule.maxUsage;
}

function computeDiscount(rule: PromotionRule, subtotal: number) {
  let discountTotal = 0;
  if (rule.type === 'PERCENT') {
    discountTotal = Math.round(subtotal * (rule.value / 100) * 100) / 100;
  } else {
    discountTotal = Math.min(subtotal, rule.value);
  }
  return Math.max(0, Math.min(subtotal, discountTotal));
}

function matchesCartConditions(rule: PromotionRule, input: CartPromotionInput) {
  const cond = rule.conditions;
  if (cond?.minSpend != null && input.subtotal < cond.minSpend) return false;
  if (cond?.minItems != null && input.itemCount < cond.minItems) return false;
  if (cond?.channels?.length && input.channel) {
    const ch = input.channel.toUpperCase();
    if (!cond.channels.map((c) => c.toUpperCase()).includes(ch)) return false;
  }
  if (cond?.segment && input.segment) {
    if (cond.segment.toUpperCase() !== input.segment.toUpperCase()) return false;
  }
  return true;
}

/** IF/THEN cart rules — returns best single auto-apply discount. */
export function evaluateCartPromotions(
  rules: PromotionRule[],
  input: CartPromotionInput,
  asOfDate = todayIsoDate(),
): PromotionEvaluation {
  let best: PromotionEvaluation = { valid: false, discountTotal: 0 };

  for (const rule of rules) {
    if (!rule.active || !rule.autoApply) continue;
    if (ruleIsExpired(rule, asOfDate) || ruleUsageExceeded(rule)) continue;
    if (input.subtotal < rule.minSpend) continue;
    if (!matchesCartConditions(rule, input)) continue;

    const discountTotal = computeDiscount(rule, input.subtotal);
    if (discountTotal > best.discountTotal) {
      best = { valid: true, discountTotal, rule, autoApplied: true };
    }
  }

  return best;
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

  const discountTotal = computeDiscount(rule, subtotal);

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
  {
    id: 'promo_auto_storefront_10k',
    code: '_AUTO_STORE_10K',
    type: 'FIXED',
    value: 1000,
    minSpend: 10000,
    usageCount: 0,
    active: true,
    autoApply: true,
    validUntil: '2026-12-31',
    conditions: { minSpend: 10000, channels: ['STOREFRONT'] },
  },
];
