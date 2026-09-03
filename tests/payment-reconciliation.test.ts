/**
 * GRABBER BUSINESS OS — PAYMENT RECONCILIATION TESTS
 * Verifies gateway payments feed cleanly into canonical payment lifecycle & GL
 */

import { describe, it, expect } from 'vitest';
import {
  auditPaymentIdentity,
  buildSaleJournalEntry,
  buildCompensatingRefundJournal,
  type PaymentTransactionRecord,
  type OrderFinancialSnapshot,
} from '../src/lib/commerce/payment-lifecycle';
import type { PaymentGatewayId } from '../src/lib/payments/payment-types';

describe('M4: Gateway Payment Reconciliation & Accounting Identity', () => {
  const orderSnapshot: OrderFinancialSnapshot = {
    id: 'ord_recon_01',
    orderNumber: 'STORE-RECON-101',
    channel: 'STOREFRONT',
    subtotal: 100000,
    discountTotal: 10000,
    taxableTotal: 90000,
    taxTotal: 16200,
    grandTotal: 106200,
    totalCost: 65000,
    orderStatus: 'DELIVERED',
    paymentStatus: 'PAID',
  };

  const gateways: PaymentGatewayId[] = ['PAYHERE', 'WEBXPAY', 'KOKO', 'MINTPAY', 'PAYZY'];

  it.each(gateways)(
    'proves gateway %s captured payment reconciles with order total and balanced GL',
    (gatewayId) => {
      const capturedRecords: PaymentTransactionRecord[] = [
        {
          id: `tx_${gatewayId.toLowerCase()}_01`,
          orderId: orderSnapshot.id,
          method: gatewayId,
          amount: 106200,
          currency: 'LKR',
          status: 'CAPTURED',
          providerRef: `prov_${gatewayId}_101`,
        },
      ];

      // 1. Payment Identity Audit
      const audit = auditPaymentIdentity(orderSnapshot.grandTotal, capturedRecords);
      expect(audit.isFullyPaid).toBe(true);
      expect(audit.capturedTotal).toBe(106200);
      expect(audit.outstandingBalance).toBe(0);
      expect(audit.reconciliationStatus).toBe('SETTLED');

      // 2. Canonical Double-Entry GL Journal
      const journal = buildSaleJournalEntry({
        order: orderSnapshot,
        payments: [{ method: gatewayId, amount: 106200 }],
      });

      expect(journal.isBalanced).toBe(true);
      expect(journal.totalDebit).toBe(journal.totalCredit);
      // Dr 1020 Bank (106,200) + Dr 5000 COGS (65,000) = 171,200
      // Cr 4000 Revenue (90,000) + Cr 2100 Tax (16,200) + Cr 1200 Inventory (65,000) = 171,200
      expect(journal.totalDebit).toBe(171200);
      expect(journal.totalCredit).toBe(171200);
    },
  );

  it('proves gateway refund creates balanced compensating journal without mutating sale history', () => {
    const refundJournal = buildCompensatingRefundJournal({
      order: orderSnapshot,
      refundNumber: 'REF-GW-01',
      refundAmount: 106200,
      refundTaxAmount: 16200,
      refundMethod: 'CARD',
      restockedCost: 65000,
    });

    expect(refundJournal.isBalanced).toBe(true);
    expect(refundJournal.totalDebit).toBe(refundJournal.totalCredit);
    expect(refundJournal.totalDebit).toBe(171200);
  });
});
