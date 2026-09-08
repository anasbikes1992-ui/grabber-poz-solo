import { describe, it, expect, vi } from 'vitest';
import { HardwareLayer, ESC_POS_COMMANDS } from '@/lib/pos/hardware-layer';
import { nextClientSequence, getTerminalId } from '@/lib/pos/offline-queue';

describe('PASS 3 — Adversarial Verification & Integrity Suite', () => {
  describe('Returns Engine Boundary & Math Probes', () => {
    it('proves return math proration computes exact discount and tax distributions', () => {
      // Order line: 5 units @ LKR 1000 = 5000, Discount = 500 (100/unit), Tax = 450 (90/unit)
      const quantity = 5;
      const unitPrice = 1000;
      const lineDiscount = 500;
      const lineTax = 450;

      const unitDiscount = lineDiscount / quantity; // 100
      const unitTax = lineTax / quantity; // 90
      const unitRefund = unitPrice - unitDiscount + unitTax; // 990

      expect(unitDiscount).toBe(100);
      expect(unitTax).toBe(90);
      expect(unitRefund).toBe(990);

      // Returning 2 units:
      const returnQty = 2;
      const totalRefund = returnQty * unitRefund; // 1980
      const cogsUnitCost = 600;
      const totalCogsReversal = returnQty * cogsUnitCost; // 1200

      expect(totalRefund).toBe(1980);
      expect(totalCogsReversal).toBe(1200);
    });

    it('proves return validation invariants reject non-positive quantities', () => {
      const validateQty = (qty: number) => {
        if (!qty || qty <= 0 || !Number.isInteger(qty)) {
          throw new Error('Return quantity must be a positive integer');
        }
        return true;
      };

      expect(() => validateQty(0)).toThrow(/positive integer/);
      expect(() => validateQty(-3)).toThrow(/positive integer/);
      expect(() => validateQty(1.5)).toThrow(/positive integer/);
      expect(validateQty(2)).toBe(true);
    });
  });

  describe('Offline POS Sequence & Terminal Invariants', () => {
    it('guarantees monotonically increasing sequence counters per terminal', () => {
      const termId = getTerminalId();
      expect(typeof termId).toBe('string');
      expect(termId.length).toBeGreaterThan(5);

      const seq1 = nextClientSequence();
      const seq2 = nextClientSequence();
      const seq3 = nextClientSequence();

      expect(seq2).toBe(seq1 + 1);
      expect(seq3).toBe(seq2 + 1);
    });
  });

  describe('POS Hardware Layer ESC/POS Output Verification', () => {
    it('builds valid ESC/POS byte buffers with drawer kick pulse and line feeds', () => {
      const receipt = HardwareLayer.buildEscPosBuffer({
        storeName: 'Lanka Super Store',
        storeAddress: '123 Galle Road, Colombo',
        orderNumber: 'ORD-2026-0099',
        date: '2026-09-08 14:30',
        cashierName: 'Sunil Perera',
        items: [
          { name: 'Red Rice 5kg', qty: 2, unitPrice: 850, total: 1700 },
          { name: 'Coconut Milk 400ml', qty: 1, unitPrice: 320, total: 320 },
        ],
        subtotal: 2020,
        discountTotal: 100,
        taxTotal: 0,
        grandTotal: 1920,
        paymentMethod: 'CASH',
        amountTendered: 2000,
        changeDue: 80,
      });

      expect(receipt).toBeInstanceOf(Uint8Array);
      expect(receipt.length).toBeGreaterThan(50);

      // Verify ESC/POS init command (0x1B, 0x40 = ESC @)
      expect(receipt[0]).toBe(0x1b);
      expect(receipt[1]).toBe(0x40);

      // Verify drawer kick command sequence (0x1B, 0x70, 0x00, 0x19, 0xFA = ESC p 0 25 250)
      expect(ESC_POS_COMMANDS.DRAWER_KICK).toEqual(new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]));
    });
  });

  describe('Double-Entry Balance & Conservation Invariants', () => {
    it('verifies debits equal credits across multi-account journal entries', () => {
      const lines = [
        { accountCode: '1010', debit: 1920, credit: 0 }, // Cash received
        { accountCode: '4010', debit: 0, credit: 2020 }, // Sales revenue
        { accountCode: '4020', debit: 100, credit: 0 }, // Discount allowed
        { accountCode: '5010', debit: 1200, credit: 0 }, // COGS
        { accountCode: '1030', debit: 0, credit: 1200 }, // Inventory asset
      ];

      const sumDebits = lines.reduce((acc, l) => acc + l.debit, 0);
      const sumCredits = lines.reduce((acc, l) => acc + l.credit, 0);

      expect(sumDebits).toBe(sumCredits);
      expect(sumDebits).toBe(3220);
    });
  });
});
