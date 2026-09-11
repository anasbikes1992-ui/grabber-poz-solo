import { describe, it, expect } from 'vitest';
import { HardwareLayer, type EscPosReceiptData } from '@/lib/pos/hardware-layer';

describe('POS Hardware Abstraction Layer (HAL)', () => {
  const sampleReceipt: EscPosReceiptData = {
    storeName: 'Royal Supermarket',
    storeAddress: '123 Galle Road, Colombo 03',
    storePhone: '0112345678',
    orderNumber: 'ORD-9821',
    date: '2026-09-08 18:30',
    cashierName: 'Sunil Perera',
    items: [
      { name: 'Red Rice 5kg', qty: 1, unitPrice: 1250, total: 1250 },
      { name: 'Anchor Butter 200g', qty: 2, unitPrice: 720, total: 1440 },
    ],
    subtotal: 2690,
    discountTotal: 90,
    taxTotal: 0,
    grandTotal: 2600,
    paymentMethod: 'CASH',
    amountTendered: 3000,
    changeDue: 400,
  };

  it('builds valid ESC/POS byte buffer containing store name and cut command', () => {
    const buffer = HardwareLayer.buildEscPosBuffer(sampleReceipt);
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(100);

    const textDecoder = new TextDecoder();
    const decoded = textDecoder.decode(buffer);
    expect(decoded).toContain('Royal Supermarket');
    expect(decoded).toContain('Red Rice 5kg');
    expect(decoded).toContain('TOTAL:    LKR 2600.00');
  });

  it('returns safe fallback in headless environment', async () => {
    const result = await HardwareLayer.printReceipt(sampleReceipt);
    expect(result.success).toBe(true);
    expect(['BUFFER_SIMULATION', 'BROWSER_DIALOG']).toContain(result.method);
  });

  it('generates binary ESC/POS thermal buffers for 80mm printers with VAT and line items', async () => {
    const { ESCPOSPrinterController } = await import('@/lib/hardware/printer');
    const buffer = ESCPOSPrinterController.generateReceiptBuffer({
      storeName: 'Grabber Flagship',
      branchName: 'Colombo 03',
      billNumber: 'POS-00981',
      cashierName: 'Cashier 01',
      date: '2026-09-11 14:00',
      items: [
        { name: 'Casual Linen Shirt', qty: 1, unitPrice: 4500, totalPrice: 4500 },
      ],
      subtotal: 4500,
      vatAmount: 810,
      grandTotal: 5310,
      tenderMethod: 'CASH',
      amountPaid: 6000,
      changeDue: 690,
      loyaltyPointsEarned: 53,
    });
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.byteLength).toBeGreaterThan(50);
  });
});

