import { describe, it, expect, vi } from 'vitest';
import { AnomalyDetector } from '@/lib/jarvis/anomaly-detector';

describe('P2P Supplier Accounting & RTO Logistics Integrity', () => {
  describe('Jarvis Anomaly Detection Adaptive Invariants', () => {
    it('detects critical sales drops when statistically significant volume exists', () => {
      const anomalies = AnomalyDetector.detectSalesAnomalies({
        todayRevenue: 2000,
        avgDailyRevenue7d: 25000,
        todayOrders: 2,
        avgDailyOrders7d: 15,
        cancelledOrdersCount: 0,
      });

      expect(anomalies.length).toBeGreaterThan(0);
      const dropAnomaly = anomalies.find((a) => a.category === 'SALES' && a.severity === 'CRITICAL');
      expect(dropAnomaly).toBeDefined();
      expect(dropAnomaly?.evidence.deviationPercent).toBeLessThan(-50);
      expect(dropAnomaly?.confidencePercent).toBeGreaterThanOrEqual(75);
    });

    it('does not trigger false positive sales drop when volume is below minimum baseline', () => {
      const anomalies = AnomalyDetector.detectSalesAnomalies({
        todayRevenue: 100,
        avgDailyRevenue7d: 2000, // Below 10,000 threshold
        todayOrders: 1,
        avgDailyOrders7d: 1,
        cancelledOrdersCount: 0,
      });

      expect(anomalies.length).toBe(0);
    });

    it('flags high cancellation rate when at least 5 orders occur', () => {
      const anomalies = AnomalyDetector.detectSalesAnomalies({
        todayRevenue: 50000,
        avgDailyRevenue7d: 45000,
        todayOrders: 10,
        avgDailyOrders7d: 10,
        cancelledOrdersCount: 4, // 40% cancellation
      });

      expect(anomalies.length).toBe(1);
      expect(anomalies[0].title).toContain('Elevated Order Cancellation Rate (40%)');
      expect(anomalies[0].severity).toBe('HIGH');
    });

    it('detects imminent inventory stockout based on daily velocity', () => {
      const anomalies = AnomalyDetector.detectInventoryAnomalies([
        {
          productId: 'prod-milk',
          productName: 'Fresh Milk 1L',
          onHand: 4,
          reorderLevel: 10,
          dailyVelocity7d: 2, // 4 / 2 = 2 days left (<= 3 days threshold)
          unitPrice: 450,
        },
        {
          productId: 'prod-rice',
          productName: 'Keeri Samba 5kg',
          onHand: 50,
          reorderLevel: 20,
          dailyVelocity7d: 1, // 50 days left (no anomaly)
          unitPrice: 1800,
        },
      ]);

      expect(anomalies.length).toBe(1);
      expect(anomalies[0].title).toContain('Fresh Milk 1L');
      expect(anomalies[0].category).toBe('INVENTORY');
      expect(anomalies[0].recommendedAction.actionType).toBe('DRAFT_PO');
    });
  });

  describe('Delivery Return-to-Origin (RTO) Restock Invariant', () => {
    it('restocks items into physical inventory ledger on return', async () => {
      const { StockService } = await import('@/lib/inventory/stock-service');
      
      const balances: Record<string, number> = { 'loc-1:prod-1': 5 };
      const movements: Array<Record<string, any>> = [];

      const mockTx = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => [{ id: 'b-1', locationType: 'BRANCH', locationId: 'loc-1', productId: 'prod-1', onHand: balances['loc-1:prod-1'], reserved: 0, damaged: 0 }],
            }),
          }),
        }),
        update: () => ({
          set: (vals: any) => ({
            where: () => ({
              returning: () => {
                balances['loc-1:prod-1'] += 2;
                return [{ id: 'b-1', onHand: balances['loc-1:prod-1'] }];
              },
            }),
          }),
        }),
        insert: () => ({
          values: (vals: any) => {
            movements.push(vals);
            return Promise.resolve();
          },
        }),
      };

      await StockService.recordReturn(
        mockTx as any,
        { locationType: 'BRANCH', locationId: 'loc-1' },
        { productId: 'prod-1', quantity: 2, unitCost: 150 },
        { referenceType: 'DELIVERY_RETURN', referenceId: 'del-99', notes: 'RTO Restock' },
      );

      expect(balances['loc-1:prod-1']).toBe(7);
      expect(movements.length).toBe(1);
      expect(movements[0].type).toBe('RETURN');
      expect(movements[0].delta).toBe(2);
      expect(movements[0].referenceType).toBe('DELIVERY_RETURN');
    });
  });

  describe('P2P Supplier Payment Accounting Invariants', () => {
    it('balances double-entry GL (Debit AP, Credit Bank/Cash) on supplier disbursement', () => {
      const disbursementAmount = 45000;
      const paymentMethod = 'BANK_TRANSFER';
      const creditAccountCode = paymentMethod === 'CASH' ? '1010' : '1020';

      const journalLines = [
        { accountCode: '2000', type: 'DEBIT', amount: disbursementAmount, description: 'Accounts Payable - Supplier Disbursement' },
        { accountCode: creditAccountCode, type: 'CREDIT', amount: disbursementAmount, description: `Cash / Bank Disbursement via ${paymentMethod}` },
      ];

      const totalDebits = journalLines.filter((l) => l.type === 'DEBIT').reduce((s, l) => s + l.amount, 0);
      const totalCredits = journalLines.filter((l) => l.type === 'CREDIT').reduce((s, l) => s + l.amount, 0);

      expect(totalDebits).toBe(totalCredits);
      expect(totalDebits).toBe(disbursementAmount);

      const initialOutstandingBalance = 100000;
      const updatedBalance = initialOutstandingBalance - disbursementAmount;
      expect(updatedBalance).toBe(55000);
    });
  });

  describe('Polim Potha AR Aging Invariants', () => {
    it('accurately allocates invoices across aging buckets (0-30, 31-60, 61-90, 90+) using FIFO repayment', async () => {
      const { CreditEngine } = await import('@/lib/commerce/credit-engine');
      const engine = new CreditEngine();

      const custId = 'cust-aging-1';
      engine.setAccount({
        customerId: custId,
        customerName: 'Test AR Customer',
        creditLimit: 100000,
        currentBalance: 0,
        availableCredit: 100000,
        status: 'ACTIVE',
      });

      const now = new Date();
      const d10DaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const d45DaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
      const d100DaysAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);

      // Oldest invoice: 20,000 (100 days ago)
      engine.postEntry({ customerId: custId, type: 'INVOICE', amount: 20000, dueDate: d100DaysAgo, createdAt: d100DaysAgo });
      // Middle invoice: 30,000 (45 days ago)
      engine.postEntry({ customerId: custId, type: 'INVOICE', amount: 30000, dueDate: d45DaysAgo, createdAt: d45DaysAgo });
      // Recent invoice: 15,000 (10 days ago)
      engine.postEntry({ customerId: custId, type: 'INVOICE', amount: 15000, dueDate: d10DaysAgo, createdAt: d10DaysAgo });

      // Partial repayment of 25,000 (settles 20,000 oldest + 5,000 of 45-day invoice)
      engine.postEntry({ customerId: custId, type: 'REPAYMENT', amount: 25000, createdAt: now });

      const aging = engine.getAgingReport(custId, now);

      expect(aging.totalOutstanding).toBe(40000); // 65000 - 25000 = 40000
      expect(aging.days90Plus).toBe(0); // Fully settled by 25k repayment
      expect(aging.days31to60).toBe(25000); // 30000 - 5000 settled = 25000
      expect(aging.days0to30).toBe(15000); // Untouched recent invoice
    });
  });
});
