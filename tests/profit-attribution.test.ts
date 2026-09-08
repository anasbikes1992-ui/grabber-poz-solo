import { describe, it, expect } from 'vitest';
import { AttributionEngine, type AttributedOrder } from '@/lib/analytics/attribution-engine';

describe('Closed-Loop Revenue & Profit Attribution Engine', () => {
  it('accurately computes item COGS, gross profit, and margin per order', () => {
    const profitCalc = AttributionEngine.calculateOrderProfit(10000, [
      { unitCost: 3000, quantity: 2 }, // COGS = 6000
      { unitCost: 1000, quantity: 1 }, // COGS = 1000
    ]);

    expect(profitCalc.cogs).toBe(7000);
    expect(profitCalc.profit).toBe(3000);
    expect(profitCalc.marginPercent).toBe(30.0);
  });

  it('generates channel and campaign ROI reports distinguishing profit from revenue', () => {
    const orders: AttributedOrder[] = [
      {
        orderId: 'ord-1',
        orderNumber: 'POS-001',
        channel: 'WHATSAPP',
        campaignId: 'camp-comeback-10',
        grandTotalLkr: 15000,
        totalCogsLkr: 9000,
        grossProfitLkr: 6000,
        grossMarginPercent: 40.0,
        createdAt: new Date(),
      },
      {
        orderId: 'ord-2',
        orderNumber: 'POS-002',
        channel: 'WHATSAPP',
        campaignId: 'camp-comeback-10',
        grandTotalLkr: 25000,
        totalCogsLkr: 15000,
        grossProfitLkr: 10000,
        grossMarginPercent: 40.0,
        createdAt: new Date(),
      },
    ];

    const campaignCost = 2000; // LKR 2,000 WhatsApp messaging cost
    const report = AttributionEngine.generateChannelReport('WHATSAPP', orders, campaignCost);

    expect(report.totalRevenueLkr).toBe(40000);
    expect(report.totalGrossProfitLkr).toBe(16000);
    expect(report.blendedGrossMarginPercent).toBe(40.0);
    expect(report.realizedRoas).toBe(20.0); // 40000 / 2000
    expect(report.realizedRoiPercent).toBe(700.0); // (16000 - 2000) / 2000 * 100 = 700%
  });
});
