/**
 * GRABBER BUSINESS OS — DISCOUNT AUTHORIZATION & RULE ENFORCEMENT (M3 SLICE 4)
 *
 * Implements CI-004:
 * A client/browser may REQUEST a discount, but only the server may determine
 * whether that discount is authorized, permitted by staff role authority,
 * and economically valid.
 */

export type StaffRole =
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'CASHIER'
  | 'WAREHOUSE'
  | 'ACCOUNTANT'
  | 'MARKETING';

export interface DiscountPolicyConfig {
  /** Maximum discount percentage a cashier can grant without manager override (default: 15%) */
  maxCashierDiscountPercent: number;
  /** Maximum discount percentage a manager or admin can grant without owner override (default: 30%) */
  maxManagerDiscountPercent: number;
  /** Whether promotions and manual staff discounts can combine (default: true) */
  allowStackingWithPromotions: boolean;
  /** Maximum combined discount percentage cap for non-owner staff (default: 50%) */
  maxNonOwnerCombinedPercent: number;
}

export const DEFAULT_DISCOUNT_POLICY: DiscountPolicyConfig = {
  maxCashierDiscountPercent: 15,
  maxManagerDiscountPercent: 30,
  allowStackingWithPromotions: true,
  maxNonOwnerCombinedPercent: 50,
};

export interface DiscountAuthorizationRequest {
  /** Authoritative subtotal calculated from server catalog */
  subtotal: number;
  /** Optional client-requested manual discount fixed amount (LKR) */
  requestedDiscountAmount?: number | null;
  /** Optional client-requested manual discount percentage (0 - 100) */
  requestedDiscountPercent?: number | null;
  /** Authenticated staff role */
  staffRole?: StaffRole | null;
  /** Authenticated staff user ID */
  staffUserId?: string | null;
  /** Role of manager/owner authorizing an override */
  overrideRole?: StaffRole | null;
  /** User ID of manager/owner authorizing an override */
  overrideUserId?: string | null;
  /** Channel: POS, STOREFRONT, WHATSAPP, etc. */
  channel?: string | null;
  /** Verified promotion discount from server promotion engine */
  promotionDiscount?: number | null;
  /** Verified trade-in credit voucher amount */
  tradeInCredit?: number | null;
  /** Reason or memo for manual discount */
  reason?: string | null;
}

export interface DiscountAuditRecord {
  requestedAmount?: number;
  requestedPercent?: number;
  authorizedAmount: number;
  authorizedPercent: number;
  staffRole?: StaffRole;
  staffUserId?: string;
  overrideRole?: StaffRole;
  overrideUserId?: string;
  ruleApplied: string;
  reason: string;
  timestamp: string;
}

export interface DiscountAuthorizationResult {
  isAuthorized: boolean;
  authorizedDiscountTotal: number;
  breakdown: {
    manualDiscount: number;
    promotionDiscount: number;
    tradeInCredit: number;
    effectiveSubtotal: number;
    discountedTaxableSubtotal: number;
  };
  effectivePercent: number;
  auditTrail: DiscountAuditRecord;
  error?: string;
}

export class DiscountAuthorizationError extends Error {
  public status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'DiscountAuthorizationError';
    this.status = status;
  }
}

/**
 * CI-004: Server-Side Discount Authorization & Enforcement.
 *
 * Enforces CI-004-A through CI-004-K:
 * - Rejects negative discounts
 * - Rejects discounts exceeding subtotal
 * - Verifies staff role authority thresholds (Cashier <= 15%, Manager <= 30%, Owner <= 100%)
 * - Disallows unauthorized staff roles (Warehouse, Marketing, unauthenticated) from granting manual discounts
 * - Disallows manual staff discounts on public storefronts (promotions & trade-in only)
 * - Produces an auditable breakdown for General Ledger & Audit Logs
 */
export function authorizeDiscount(
  req: DiscountAuthorizationRequest,
  policy: DiscountPolicyConfig = DEFAULT_DISCOUNT_POLICY,
): DiscountAuthorizationResult {
  const subtotal = Math.max(0, Math.round(req.subtotal * 100) / 100);
  const channel = (req.channel || 'POS').toUpperCase();
  const isStorefront = channel === 'STOREFRONT';

  // 1. CI-004-B: Negative discount rejection
  if (req.requestedDiscountAmount != null && req.requestedDiscountAmount < 0) {
    throw new DiscountAuthorizationError('Negative discount amounts are strictly forbidden.', 400);
  }
  if (req.requestedDiscountPercent != null && req.requestedDiscountPercent < 0) {
    throw new DiscountAuthorizationError('Negative discount percentages are strictly forbidden.', 400);
  }

  // 2. Derive requested manual discount (client values are strictly advisory, never authoritative)
  let requestedManual = 0;
  let requestedPercent = req.requestedDiscountPercent ?? undefined;

  if (req.requestedDiscountPercent != null && req.requestedDiscountPercent > 0) {
    requestedPercent = Math.min(100, req.requestedDiscountPercent);
    requestedManual = Math.round((subtotal * requestedPercent) / 100 * 100) / 100;
  } else if (req.requestedDiscountAmount != null && req.requestedDiscountAmount > 0) {
    requestedManual = Math.round(req.requestedDiscountAmount * 100) / 100;
    requestedPercent = subtotal > 0 ? Math.round((requestedManual / subtotal) * 10000) / 100 : 0;
  }

  // 3. Storefront Policy: Public storefront only permits server-verified promotions and trade-in credits
  if (isStorefront && requestedManual > 0) {
    throw new DiscountAuthorizationError(
      'Manual staff discounts cannot be applied through public storefront checkout.',
      403,
    );
  }

  // 4. CI-004-E & CI-004-F: Staff Role Authority Enforcement
  const effectiveRole = req.staffRole;
  const overrideRole = req.overrideRole;

  let ruleApplied = 'STANDARD_DISCOUNT';
  let authorizedManual = requestedManual;

  if (requestedManual > 0) {
    if (!effectiveRole) {
      throw new DiscountAuthorizationError('Unauthenticated users cannot authorize manual discounts.', 401);
    }

    const unpermittedRoles: StaffRole[] = ['WAREHOUSE', 'MARKETING', 'ACCOUNTANT'];
    if (unpermittedRoles.includes(effectiveRole)) {
      throw new DiscountAuthorizationError(
        `Staff role "${effectiveRole}" does not have authority to grant sales discounts.`,
        403,
      );
    }

    const requestedPct = subtotal > 0 ? (requestedManual / subtotal) * 100 : 0;

    // CASHIER authority check (default: <= 15%)
    if (effectiveRole === 'CASHIER') {
      if (requestedPct > policy.maxCashierDiscountPercent) {
        // Requires manager or owner override
        if (!overrideRole || !['MANAGER', 'ADMIN', 'OWNER'].includes(overrideRole)) {
          throw new DiscountAuthorizationError(
            `Cashier discount of ${requestedPct.toFixed(1)}% exceeds maximum allowed ${policy.maxCashierDiscountPercent}%. Manager or Owner PIN override required.`,
            403,
          );
        }
        ruleApplied = `CASHIER_OVERRIDDEN_BY_${overrideRole}`;
      } else {
        ruleApplied = 'CASHIER_DISCOUNT';
      }
    } else if (effectiveRole === 'MANAGER' || effectiveRole === 'ADMIN') {
      if (requestedPct > policy.maxManagerDiscountPercent) {
        // Requires owner override
        if (!overrideRole || overrideRole !== 'OWNER') {
          throw new DiscountAuthorizationError(
            `Manager discount of ${requestedPct.toFixed(1)}% exceeds maximum allowed ${policy.maxManagerDiscountPercent}%. Owner override required.`,
            403,
          );
        }
        ruleApplied = 'MANAGER_OVERRIDDEN_BY_OWNER';
      } else {
        ruleApplied = `${effectiveRole}_DISCOUNT`;
      }
    } else if (effectiveRole === 'OWNER') {
      ruleApplied = 'OWNER_DIRECT_DISCOUNT';
    }
  }

  // 5. Verified Promotions & Trade-In Credits
  const promoDiscount = Math.max(0, Math.round((req.promotionDiscount || 0) * 100) / 100);
  const tradeInCredit = Math.max(0, Math.round((req.tradeInCredit || 0) * 100) / 100);

  // 6. CI-004-H: Combined discount policy & caps
  let totalDiscountCandidate = authorizedManual + promoDiscount + tradeInCredit;

  // Non-owner combined cap check (if manual + promo exceeds policy cap)
  const isOwnerOrOverriddenByOwner = effectiveRole === 'OWNER' || overrideRole === 'OWNER';
  if (!isOwnerOrOverriddenByOwner && subtotal > 0) {
    const combinedPct = ((authorizedManual + promoDiscount) / subtotal) * 100;
    if (combinedPct > policy.maxNonOwnerCombinedPercent) {
      const maxAllowedNonOwner = Math.round((subtotal * policy.maxNonOwnerCombinedPercent) / 100 * 100) / 100;
      authorizedManual = Math.max(0, maxAllowedNonOwner - promoDiscount);
      totalDiscountCandidate = authorizedManual + promoDiscount + tradeInCredit;
      ruleApplied += '_CAPPED_BY_POLICY';
    }
  }

  // 7. CI-004-A: No discount may exceed the authoritative eligible subtotal
  const authorizedDiscountTotal = Math.min(subtotal, totalDiscountCandidate);

  // 8. CI-004-I: Taxable amount is calculated strictly from discounted taxable subtotal
  const discountedTaxableSubtotal = Math.max(0, Math.round((subtotal - authorizedDiscountTotal) * 100) / 100);
  const effectivePercent = subtotal > 0 ? Math.round((authorizedDiscountTotal / subtotal) * 10000) / 100 : 0;

  const auditRecord: DiscountAuditRecord = {
    requestedAmount: req.requestedDiscountAmount ?? undefined,
    requestedPercent,
    authorizedAmount: authorizedDiscountTotal,
    authorizedPercent: effectivePercent,
    staffRole: req.staffRole ?? undefined,
    staffUserId: req.staffUserId ?? undefined,
    overrideRole: req.overrideRole ?? undefined,
    overrideUserId: req.overrideUserId ?? undefined,
    ruleApplied,
    reason: req.reason || 'Standard sales discount',
    timestamp: new Date().toISOString(),
  };

  return {
    isAuthorized: true,
    authorizedDiscountTotal,
    breakdown: {
      manualDiscount: authorizedManual,
      promotionDiscount: promoDiscount,
      tradeInCredit,
      effectiveSubtotal: subtotal,
      discountedTaxableSubtotal,
    },
    effectivePercent,
    auditTrail: auditRecord,
  };
}
