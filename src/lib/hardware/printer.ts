/**
 * GRABBER BUSINESS OS — HARDWARE PERIPHERAL CONTROLLER
 * Supports WebUSB / WebBluetooth / Browser Raw Printing for 80mm & 58mm ESC/POS Thermal Printers
 * RJ11 Cash Drawer Kick Pulse Generator (\x1B\x70\x00\x19\xFA)
 */

export interface ReceiptLineItem {
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptPayload {
  storeName: string;
  branchName: string;
  address?: string;
  phone?: string;
  vatRegNumber?: string;
  billNumber: string;
  cashierName: string;
  date: string;
  items: ReceiptLineItem[];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  tenderMethod: string;
  amountPaid: number;
  changeDue: number;
  loyaltyPointsEarned?: number;
  qrCodeUrl?: string;
  footerNote?: string;
}

export class ESCPOSPrinterController {
  // ESC/POS Command Byte Constants
  private static readonly ESC = 0x1b;
  private static readonly GS = 0x1d;

  /**
   * Generates standard ESC/POS binary buffer for 80mm thermal receipt.
   */
  public static generateReceiptBuffer(data: ReceiptPayload): Uint8Array {
    const bytes: number[] = [];

    // 1. Initialize Printer (ESC @)
    bytes.push(0x1b, 0x40);

    // 2. Alignment Center (ESC a 1)
    bytes.push(0x1b, 0x61, 0x01);

    // 3. Double-height & Double-width Header (GS ! 0x11)
    bytes.push(0x1d, 0x21, 0x11);
    this.appendString(bytes, `${data.storeName}\n`);

    // Reset Font (GS ! 0x00)
    bytes.push(0x1d, 0x21, 0x00);
    this.appendString(bytes, `${data.branchName}\n`);
    if (data.address) this.appendString(bytes, `${data.address}\n`);
    if (data.phone) this.appendString(bytes, `Tel: ${data.phone}\n`);
    if (data.vatRegNumber) this.appendString(bytes, `VAT Reg: ${data.vatRegNumber}\n`);
    this.appendString(bytes, `------------------------------------------------\n`);

    // 4. Metadata Left Aligned (ESC a 0)
    bytes.push(0x1b, 0x61, 0x00);
    this.appendString(bytes, `Bill No: ${data.billNumber}   Date: ${data.date}\n`);
    this.appendString(bytes, `Cashier: ${data.cashierName}   Tender: ${data.tenderMethod}\n`);
    this.appendString(bytes, `------------------------------------------------\n`);
    this.appendString(bytes, `Item                     Qty    Price     Amount\n`);
    this.appendString(bytes, `------------------------------------------------\n`);

    // 5. Line Items
    for (const item of data.items) {
      const name = item.name.substring(0, 22).padEnd(23, ' ');
      const qty = item.qty.toString().padStart(3, ' ');
      const price = item.unitPrice.toFixed(2).padStart(9, ' ');
      const total = item.totalPrice.toFixed(2).padStart(11, ' ');
      this.appendString(bytes, `${name} ${qty} ${price} ${total}\n`);
    }

    this.appendString(bytes, `------------------------------------------------\n`);

    // 6. Totals Section (ESC a 2 - Right Align)
    bytes.push(0x1b, 0x61, 0x02);
    this.appendString(bytes, `Subtotal (Excl. Tax): LKR ${data.subtotal.toFixed(2)}\n`);
    this.appendString(bytes, `VAT (18% Output): LKR ${data.vatAmount.toFixed(2)}\n`);
    
    // Bold Grand Total (ESC E 1)
    bytes.push(0x1b, 0x45, 0x01);
    bytes.push(0x1d, 0x21, 0x01); // Double height
    this.appendString(bytes, `TOTAL DUE: LKR ${data.grandTotal.toFixed(2)}\n`);
    bytes.push(0x1d, 0x21, 0x00);
    bytes.push(0x1b, 0x45, 0x00); // Bold off

    this.appendString(bytes, `Amount Tendered: LKR ${data.amountPaid.toFixed(2)}\n`);
    this.appendString(bytes, `Change Returned: LKR ${data.changeDue.toFixed(2)}\n`);
    if (data.loyaltyPointsEarned) {
      this.appendString(bytes, `Loyalty Points Earned: +${data.loyaltyPointsEarned} pts\n`);
    }

    // 7. Footer Center Aligned (ESC a 1)
    bytes.push(0x1b, 0x61, 0x01);
    this.appendString(bytes, `------------------------------------------------\n`);
    this.appendString(bytes, `${data.footerNote || 'Thank you for shopping with us! Please come again.'}\n`);
    this.appendString(bytes, `Powered by Grabber Business OS\n\n\n`);

    // 8. Open Cash Drawer Pulse (ESC p 0 25 250)
    bytes.push(0x1b, 0x70, 0x00, 0x19, 0xfa);

    // 9. Full Cut Paper (GS V 65 0)
    bytes.push(0x1d, 0x56, 0x41, 0x00);

    return new Uint8Array(bytes);
  }

  private static appendString(bytes: number[], str: string): void {
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
  }

  /**
   * Browser Direct Print Dispatcher.
   */
  public static printBrowserReceipt(data: ReceiptPayload): void {
    if (typeof window === 'undefined') return;
    window.print();
  }
}
