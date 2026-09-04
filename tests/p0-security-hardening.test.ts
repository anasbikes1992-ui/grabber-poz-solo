import { describe, it, expect } from 'vitest';
import { applyDecrementSale, InsufficientStockError } from '@/lib/inventory/stock-invariants';
import { authorizeCreditSale } from '@/lib/commerce/customer-credit-authorization';

describe('P0 Security Hardening: Roles, Amounts & Invariants', () => {
  describe('P0-1: Typed InsufficientStockError', () => {
    it('throws InsufficientStockError with accurate available and requested quantities', () => {
      const snap = { onHand: 5, reserved: 2 }; // available = 3
      expect(() => applyDecrementSale(snap, 5)).toThrow(InsufficientStockError);

      try {
        applyDecrementSale(snap, 5);
      } catch (err: any) {
        expect(err).toBeInstanceOf(InsufficientStockError);
        expect(err.name).toBe('InsufficientStockError');
        expect(err.available).toBe(3);
        expect(err.requested).toBe(5);
        expect(err.message).toContain('Insufficient available stock');
      }
    });

    it('successfully fulfills when available stock meets quantity', () => {
      const snap = { onHand: 10, reserved: 2 }; // available = 8
      const next = applyDecrementSale(snap, 4);
      expect(next.onHand).toBe(6);
      expect(next.reserved).toBe(0); // released min(4, 2) = 2
    });
  });

  describe('P0-2: Role-Proof Credit Sale Authorization', () => {
    const mockCustomer = {
      id: 'c1',
      creditLimit: 500,
      active: true,
      name: 'Test Customer',
      phone: '0771234567',
    };

    const mockAccount = {
      customerId: 'c1',
      creditLimit: 500,
      currentBalance: 300,
      status: 'ACTIVE' as const,
    };

    it('rejects credit sale when CASHIER role attempts to exceed available credit limit', () => {
      // currentBalance = 300, creditLimit = 500. Available credit = 200.
      // Attempt to purchase 350 credit -> new balance 650 > 500.
      expect(() => {
        authorizeCreditSale({
          customer: mockCustomer,
          account: mockAccount,
          creditAmount: 350,
          staffRole: 'CASHIER',
          staffUserId: 'cashier-1',
          orderNumber: 'POS-001',
        });
      }).toThrow(/credit limit exceeded/i);
    });

    it('allows credit sale within available limit for CASHIER role', () => {
      const auth = authorizeCreditSale({
        customer: mockCustomer,
        account: mockAccount,
        creditAmount: 150, // 300 + 150 = 450 <= 500
        staffRole: 'CASHIER',
        staffUserId: 'cashier-1',
        orderNumber: 'POS-002',
      });

      expect(auth.authorized).toBe(true);
      expect(auth.newBalance).toBe(450);
      expect(auth.entryDraft.amount).toBe(150);
      expect(auth.ruleApplied).toBe('STANDARD_CREDIT_SALE');
    });

    it('allows manager/owner override to exceed credit limit with override fields', () => {
      const auth = authorizeCreditSale({
        customer: mockCustomer,
        account: mockAccount,
        creditAmount: 350,
        staffRole: 'CASHIER',
        staffUserId: 'cashier-1',
        overrideRole: 'OWNER',
        overrideUserId: 'owner-1',
        orderNumber: 'POS-003',
      });

      expect(auth.authorized).toBe(true);
      expect(auth.newBalance).toBe(650);
      expect(auth.ruleApplied).toBe('CREDIT_LIMIT_OVERRIDDEN_BY_OWNER');
    });
  });
});
