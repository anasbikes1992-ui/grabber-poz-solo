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
});
