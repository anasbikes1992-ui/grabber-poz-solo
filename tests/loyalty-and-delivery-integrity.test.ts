import { describe, it, expect } from 'vitest';
import { verifyRestoredDatabaseIntegrity } from '@/lib/backup/crypto-backup';

describe('Core Commerce & Operations Integrity Suite', () => {
  describe('Disaster Recovery & Backup Schema Validation', () => {
    it('rejects null or non-object payloads with a descriptive error', () => {
      const nullResult = verifyRestoredDatabaseIntegrity(null);
      expect(nullResult.valid).toBe(false);
      expect(nullResult.errors[0]).toContain('expected an object');

      const stringResult = verifyRestoredDatabaseIntegrity('not-an-object');
      expect(stringResult.valid).toBe(false);
      expect(stringResult.errors[0]).toContain('expected an object');
    });

    it('passes valid restored dataset with balanced debits/credits and non-negative stock', () => {
      const validPayload = {
        orders: [{ id: 'o-1', orderNumber: 'ORD-101', orderStatus: 'COMPLETED' }],
        orderItems: [{ id: 'oi-1', orderId: 'o-1', productId: 'p-1', quantity: 2 }],
        stockBalances: [{ locationId: 'loc-1', productId: 'p-1', onHand: 10 }],
        stockMovements: [{ locationId: 'loc-1', productId: 'p-1', delta: 10 }],
        journalLines: [
          { type: 'DEBIT', amount: 500 },
          { type: 'CREDIT', amount: 500 },
        ],
      };
      const result = verifyRestoredDatabaseIntegrity(validPayload);
      expect(result.valid).toBe(true);
      expect(result.checks.journalsBalance).toBe(true);
      expect(result.checks.stockIntegrity).toBe(true);
      expect(result.checks.ordersConsistent).toBe(true);
      expect(result.checks.noNegativeBalances).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Loyalty Discount Authorization Invariants', () => {
    it('authorizes verified loyalty discount up to cart subtotal', async () => {
      const { authorizeDiscount } = await import('@/lib/commerce/discount-authorization');
      const auth = authorizeDiscount({
        subtotal: 5000,
        staffRole: 'CASHIER',
        loyaltyDiscount: 800, // 800 LKR discount from 800 points
      });

      expect(auth.isAuthorized).toBe(true);
      expect(auth.authorizedDiscountTotal).toBe(800);
      expect(auth.breakdown.loyaltyDiscount).toBe(800);
      expect(auth.breakdown.discountedTaxableSubtotal).toBe(4200);
    });

    it('caps total combined discount (manual + promo + loyalty) at cart subtotal', async () => {
      const { authorizeDiscount } = await import('@/lib/commerce/discount-authorization');
      const auth = authorizeDiscount({
        subtotal: 1000,
        staffRole: 'OWNER',
        promotionDiscount: 500,
        loyaltyDiscount: 800, // 500 + 800 = 1300, exceeds 1000 subtotal
      });

      expect(auth.isAuthorized).toBe(true);
      expect(auth.authorizedDiscountTotal).toBe(1000);
      expect(auth.breakdown.discountedTaxableSubtotal).toBe(0);
    });
  });
});
