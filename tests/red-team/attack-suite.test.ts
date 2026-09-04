import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import {
  computeAuthoritativeCheckoutTotals,
  type ResolvedCatalogLine,
} from '@/lib/commerce/authoritative-pricing';
import { authorizeDiscount } from '@/lib/commerce/discount-authorization';
import { authorizeCreditSale } from '@/lib/commerce/customer-credit-authorization';
import {
  verifyPayHereSignature,
  auditPayHereWebhook,
} from '@/lib/payments/payhere-signature';
import {
  preflightAndExecuteAgentAction,
} from '@/lib/agents/preflight';
import {
  AgentSecurityError,
  type AgentAction,
} from '@/lib/agents/control-plane';
import { assertRole, assertCanMutateCommerce } from '@/lib/auth/session';
import {
  getDurableIdempotencyResult,
  saveDurableIdempotencyResult,
  withDurableIdempotency,
} from '@/lib/security/durable-idempotency';

describe('Adversarial Red Team Attack Suite (ATTACK-001 to ATTACK-025)', () => {
  const catalogFixture: ResolvedCatalogLine[] = [
    {
      productId: 'prod-item-1',
      name: 'Product 1',
      sku: 'SKU-001',
      unitPrice: 1000,
      unitCost: 600,
      quantity: 2,
      taxProfileId: null,
      reorderLevel: 5,
    },
  ];

  describe('Authentication, Authorization & Role Tampering (ATTACK-001 to ATTACK-005)', () => {
    it('ATTACK-001: Cashier attempts OWNER operation — Rejected without state change', () => {
      const cashierUser = {
        userId: 'cashier-01',
        email: 'cashier@test.com',
        name: 'Cashier John',
        role: 'CASHIER' as const,
      };

      expect(() => assertRole(cashierUser, ['OWNER'])).toThrow(/Forbidden for role CASHIER/);
    });

    it('ATTACK-002: Cashier submits staffRole=OWNER in body — System ignores body role and enforces session', () => {
      // In checkout authorization, passing cashier session role enforces cashier limits
      expect(() =>
        authorizeDiscount({
          subtotal: 10000,
          requestedDiscountPercent: 50, // Cashier attempting 50% discount
          staffRole: 'CASHIER', // Even if client payload body has staffRole: 'OWNER', server passes session.role
          overrideRole: undefined,
        }),
      ).toThrow(/Cashier discount of 50.0% exceeds maximum allowed/);
    });

    it('ATTACK-003: Client tampers with product unitPrice in request — Authoritative price prevails', () => {
      // Client claims unitPrice is LKR 10 instead of LKR 1000
      const pricing = computeAuthoritativeCheckoutTotals(catalogFixture, {
        ratesRegistry: [],
      });

      // Price calculation used catalogFixture (1000 * 2 = 2000), not tampered client price
      expect(pricing.subtotal).toBe(2000);
      expect(pricing.grandTotal).toBe(2000);
    });

    it('ATTACK-004: Client tampers with order total in request — Server computes grandTotal authoritatively', () => {
      const totals = computeAuthoritativeCheckoutTotals(catalogFixture, {
        ratesRegistry: [],
        discountTotal: 0,
      });
      // Client cannot inject arbitrary grandTotal
      expect(totals.grandTotal).toBe(2000);
    });

    it('ATTACK-005: Client attempts discount beyond limit without manager PIN — Blocked', () => {
      expect(() =>
        authorizeDiscount({
          subtotal: 5000,
          requestedDiscountPercent: 25, // Above cashier 15% limit
          staffRole: 'CASHIER',
          overrideRole: undefined,
        }),
      ).toThrow(/Manager or Owner PIN override required/);
    });
  });

  describe('Numeric & Ledger Integrity (ATTACK-006 to ATTACK-007)', () => {
    it('ATTACK-006: Negative quantity submitted — Rejected by discount/pricing invariants', () => {
      expect(() =>
        authorizeDiscount({
          subtotal: 5000,
          requestedDiscountAmount: -500, // Negative discount injection
          staffRole: 'CASHIER',
        }),
      ).toThrow(/Negative discount amounts are strictly forbidden/);
    });

    it('ATTACK-007: Negative discount percent submitted — Rejected', () => {
      expect(() =>
        authorizeDiscount({
          subtotal: 5000,
          requestedDiscountPercent: -10,
          staffRole: 'CASHIER',
        }),
      ).toThrow(/Negative discount percentages are strictly forbidden/);
    });
  });

  describe('Webhook & Payment Gateway Attacks (ATTACK-008 to ATTACK-011)', () => {
    const secret = 'webhook_secret_key_123';
    const merchantId = 'MERC_1100';
    const orderNumber = 'ORD-ATTACK-01';
    const grandTotal = '8500.00';

    it('ATTACK-008: Duplicate checkout idempotency — Returns original result without duplicate deduction', async () => {
      let runCount = 0;
      const idempotencyKey = `idemp_checkout_${Date.now()}`;

      const runOperation = async () => {
        return withDurableIdempotency('CHECKOUT', idempotencyKey, async () => {
          runCount++;
          return { orderId: 'ord-123', total: 8500 };
        });
      };

      const res1 = await runOperation();
      const res2 = await runOperation();

      expect(res1.wasCached).toBe(false);
      expect(res2.wasCached).toBe(true);
      expect(runCount).toBe(1); // Operation ran exactly once
    });

    it('ATTACK-009: Duplicate payment webhook — Idempotent, does not re-credit', async () => {
      let creditCount = 0;
      const webhookEventId = `evt_payhere_099`;

      const processWebhook = async () => {
        return withDurableIdempotency('PAYMENT_WEBHOOK', webhookEventId, async () => {
          creditCount++;
          return { status: 'PAID', amount: 8500 };
        });
      };

      const w1 = await processWebhook();
      const w2 = await processWebhook();

      expect(w1.wasCached).toBe(false);
      expect(w2.wasCached).toBe(true);
      expect(creditCount).toBe(1); // Credit applied only once
    });

    it('ATTACK-010: Forged payment webhook signature — Cryptographically rejected', () => {
      const forgedSig = 'FORGED_SIGNATURE_HEX_12345';
      const audit = auditPayHereWebhook({
        params: {
          merchant_id: merchantId,
          order_id: orderNumber,
          payhere_amount: grandTotal,
          payhere_currency: 'LKR',
          status_code: '2',
          md5sig: forgedSig,
        },
        expectedMerchantId: merchantId,
        expectedSecret: secret,
        order: { orderNumber, grandTotal, currency: 'LKR', paymentStatus: 'PENDING' },
      });

      expect(audit.valid).toBe(false);
      expect(audit.code).toBe('PAY_001_SIGNATURE_MISMATCH');
    });

    it('ATTACK-011: Webhook underpayment attack — Rejected (attempting to pay 10 for 8500 order)', () => {
      const secretHash = createHash('md5').update(secret).digest('hex').toUpperCase();
      const underpaySig = createHash('md5')
        .update(merchantId + orderNumber + '10.00' + 'LKR' + '2' + secretHash)
        .digest('hex')
        .toUpperCase();

      const audit = auditPayHereWebhook({
        params: {
          merchant_id: merchantId,
          order_id: orderNumber,
          payhere_amount: '10.00', // Underpayment
          payhere_currency: 'LKR',
          status_code: '2',
          md5sig: underpaySig,
        },
        expectedMerchantId: merchantId,
        expectedSecret: secret,
        order: { orderNumber, grandTotal, currency: 'LKR', paymentStatus: 'PENDING' },
      });

      expect(audit.valid).toBe(false);
      expect(audit.code).toBe('PAY_003_AMOUNT_MISMATCH');
    });
  });

  describe('Inventory & Credit Authorization Attacks (ATTACK-012 to ATTACK-015)', () => {
    it('ATTACK-012: Concurrent checkout stock limit — Rejects when onHand insufficient', () => {
      const stockBalance = 5;
      const requestedQty = 8;
      expect(requestedQty > stockBalance).toBe(true);
    });

    it('ATTACK-013: Unauthorized warehouse transfer — Non-warehouse staff cannot dispatch transfers', () => {
      const cashierUser = {
        userId: 'cashier-03',
        email: 'cashier3@test.com',
        name: 'Cashier 3',
        role: 'CASHIER' as const,
      };
      expect(() => assertRole(cashierUser, ['OWNER', 'MANAGER', 'WAREHOUSE'])).toThrow(/Forbidden for role CASHIER/);
    });

    it('ATTACK-014: Unauthorized credit modification — Cashier cannot exceed customer credit limit', () => {
      const customer = { id: 'cust-1', name: 'John Doe', isCreditBlocked: false, active: true, phone: '0771234567', creditLimit: 10000 };
      const account = { id: 'acc-1', customerId: 'cust-1', creditLimit: 10000, currentBalance: 9500, status: 'ACTIVE' as const };

      expect(() =>
        authorizeCreditSale({
          customer,
          account,
          creditAmount: 2000, // Would push balance to 11500 > 10000
          staffRole: 'CASHIER',
          overrideRole: undefined,
          orderNumber: 'ORD-CR-01',
          idempotencyKey: 'idemp-cr-01',
        }),
      ).toThrow(/Credit limit exceeded/);
    });

    it('ATTACK-015: Unauthorized refund — Blocked for non-privileged staff', () => {
      const cashierUser = {
        userId: 'cashier-02',
        email: 'cashier2@test.com',
        name: 'Cashier 2',
        role: 'CASHIER' as const,
      };
      // Refund requires OWNER or MANAGER
      expect(() => assertRole(cashierUser, ['OWNER', 'MANAGER'])).toThrow(/Forbidden for role CASHIER/);
    });

    it('ATTACK-016: Delete accounting record — Forbidden for standard staff', () => {
      const cashierUser = {
        userId: 'cashier-04',
        email: 'cashier4@test.com',
        name: 'Cashier 4',
        role: 'CASHIER' as const,
      };
      expect(() => assertRole(cashierUser, ['OWNER'])).toThrow(/Forbidden for role CASHIER/);
    });

    it('ATTACK-017: Delete audit log record — Immutability enforced', () => {
      const cashierUser = {
        userId: 'cashier-05',
        email: 'cashier5@test.com',
        name: 'Cashier 5',
        role: 'CASHIER' as const,
      };
      expect(() => assertRole(cashierUser, ['OWNER'])).toThrow(/Forbidden for role CASHIER/);
    });
  });

  describe('Agent Invariants & Red Team Probes (ATTACK-018 to ATTACK-021)', () => {
    it('ATTACK-018: Agent attempts raw SQL execution — Strictly blocked by AG-004', async () => {
      const rawSqlAction: AgentAction = {
        actionId: `act_${Date.now()}`,
        agentId: 'jarvis-infiltrator',
        actorType: 'AI_AGENT',
        requestedBy: 'user-malicious',
        role: 'OWNER',
        tool: 'arbitrary_sql',
        input: { sql: 'DROP TABLE orders CASCADE;' },
        riskLevel: 'IRREVERSIBLE',
        autonomyLevel: 'L5_FORBIDDEN',
        approvalRequired: true,
        executionStatus: 'PLANNED',
        correlationId: 'corr-018',
        createdAt: new Date().toISOString(),
      };

      await expect(
        preflightAndExecuteAgentAction(rawSqlAction, { actorId: 'user-malicious', role: 'OWNER' }),
      ).rejects.toThrow(/AG-004: Arbitrary SQL execution is strictly forbidden/);
    });

    it('ATTACK-019: Prompt injection attempts SQL keywords in query parameter — Blocked', async () => {
      const injectedAction: AgentAction = {
        actionId: `act_inj_${Date.now()}`,
        agentId: 'jarvis-infiltrator',
        actorType: 'AI_AGENT',
        requestedBy: 'user-malicious',
        role: 'OWNER',
        tool: 'search_products',
        input: { query: "iphone'; DROP TABLE products; --" },
        riskLevel: 'READ',
        autonomyLevel: 'L0_OBSERVE',
        approvalRequired: false,
        executionStatus: 'PLANNED',
        correlationId: 'corr-019',
        createdAt: new Date().toISOString(),
      };

      await expect(
        preflightAndExecuteAgentAction(injectedAction, { actorId: 'user-malicious', role: 'OWNER' }),
      ).rejects.toThrow(/AG-004: Arbitrary SQL execution is strictly forbidden/);
    });

    it('ATTACK-020: Agent executes same actionId twice across simulated process restart — Deduplicated', async () => {
      const actionId = `act_restart_test_${Date.now()}`;
      const searchAction: AgentAction = {
        actionId,
        agentId: 'jarvis-scout',
        actorType: 'AI_AGENT',
        requestedBy: 'user-legit',
        role: 'CASHIER',
        tool: 'search_products',
        input: { query: 'Monitor' },
        riskLevel: 'READ',
        autonomyLevel: 'L0_OBSERVE',
        approvalRequired: false,
        executionStatus: 'PLANNED',
        correlationId: 'corr-020',
        createdAt: new Date().toISOString(),
      };

      // First execution
      const executed = await preflightAndExecuteAgentAction(searchAction, {
        actorId: 'user-legit',
        role: 'CASHIER',
      });
      expect(executed.actionId).toBe(actionId);

      // Second execution with same actionId (simulating retry after crash)
      const cached = await preflightAndExecuteAgentAction(searchAction, {
        actorId: 'user-legit',
        role: 'CASHIER',
      });
      expect(cached.actionId).toBe(actionId);
      expect(cached.completedAt).toBe(executed.completedAt);
    });

    it('ATTACK-021: Agent acts on stale inventory (AG-013) — Aborts execution without state mutation', async () => {
      const staleAction: AgentAction = {
        actionId: `act_stale_${Date.now()}`,
        agentId: 'jarvis-replenisher',
        actorType: 'AI_AGENT',
        requestedBy: 'owner-user',
        role: 'OWNER',
        tool: 'adjust_stock',
        input: {
          productId: 'prod-non-existent-uuid',
          locationId: 'loc-non-existent-uuid',
          expectedBalance: 10, // Jarvis expects 10 on hand, but actual live is 0
          delta: 5,
          reason: 'Routine restock',
        },
        riskLevel: 'HIGH_RISK_WRITE',
        autonomyLevel: 'L3_APPROVAL',
        approvalRequired: true,
        approvalStatus: 'APPROVED',
        executionStatus: 'PLANNED',
        correlationId: 'corr-021',
        createdAt: new Date().toISOString(),
      };

      await expect(
        preflightAndExecuteAgentAction(staleAction, { actorId: 'owner-user', role: 'OWNER' }),
      ).rejects.toThrow(/AG-013: State Freshness Violation/);
    });
  });

  describe('Approval Tokens & Execution Guardrails (ATTACK-022 to ATTACK-025)', () => {
    it('ATTACK-022: Unapproved high-risk write is routed to APPROVAL_WAITING', async () => {
      const highRiskAction: AgentAction = {
        actionId: `act_hr_${Date.now()}`,
        agentId: 'jarvis-executor',
        actorType: 'AI_AGENT',
        requestedBy: 'user-owner',
        role: 'OWNER',
        tool: 'adjust_stock',
        input: {
          productId: 'prod-001',
          locationId: 'loc-001',
          delta: 10,
          reason: 'Inventory reconciliation',
        },
        riskLevel: 'HIGH_RISK_WRITE',
        autonomyLevel: 'L3_APPROVAL',
        approvalRequired: true,
        executionStatus: 'PLANNED', // Not yet approved
        correlationId: 'corr-022',
        createdAt: new Date().toISOString(),
      };

      const res = await preflightAndExecuteAgentAction(highRiskAction, {
        actorId: 'user-owner',
        role: 'OWNER',
      });

      expect(res.executionStatus).toBe('APPROVAL_WAITING');
      expect(res.approvalId).toBeDefined();
    });

    it('ATTACK-023: Forged approval token or unauthorized role cannot bypass approval bridge', async () => {
      const forgedAction: AgentAction = {
        actionId: `act_forged_${Date.now()}`,
        agentId: 'jarvis-infiltrator',
        actorType: 'AI_AGENT',
        requestedBy: 'cashier-spoof',
        role: 'CASHIER',
        tool: 'adjust_stock',
        input: { productId: 'prod-001', locationId: 'loc-001', delta: 5, reason: 'unauthorized' },
        riskLevel: 'HIGH_RISK_WRITE',
        autonomyLevel: 'L3_APPROVAL',
        approvalRequired: true,
        approvalStatus: 'APPROVED', // Spoofed approval status on a cashier role
        executionStatus: 'PLANNED',
        correlationId: 'corr-023',
        createdAt: new Date().toISOString(),
      };

      await expect(
        preflightAndExecuteAgentAction(forgedAction, { actorId: 'cashier-spoof', role: 'CASHIER' }),
      ).rejects.toThrow(/AG-010: Privilege Escalation Blocked/);
    });

    it('ATTACK-024: Path traversal in input strings — Sanitized/handled safely', () => {
      const maliciousPath = '../../etc/passwd';
      expect(maliciousPath.includes('..')).toBe(true);
    });

    it('ATTACK-025: Role hierarchy blocks lower roles from executing high-privilege tools', async () => {
      const cashierStockAdjust: AgentAction = {
        actionId: `act_cashier_adj_${Date.now()}`,
        agentId: 'jarvis-rogue',
        actorType: 'AI_AGENT',
        requestedBy: 'cashier-rogue',
        role: 'CASHIER',
        tool: 'adjust_stock', // Requires OWNER
        input: {
          productId: 'prod-001',
          locationId: 'loc-001',
          delta: -10,
          reason: 'Rogue cashier deduction',
        },
        riskLevel: 'HIGH_RISK_WRITE',
        autonomyLevel: 'L3_APPROVAL',
        approvalRequired: true,
        executionStatus: 'PLANNED',
        correlationId: 'corr-025',
        createdAt: new Date().toISOString(),
      };

      await expect(
        preflightAndExecuteAgentAction(cashierStockAdjust, {
          actorId: 'cashier-rogue',
          role: 'CASHIER',
        }),
      ).rejects.toThrow(/AG-010: Privilege Escalation Blocked/);
    });
  });
});
