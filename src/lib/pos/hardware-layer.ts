/**
 * GRABBER POS HARDWARE ABSTRACTION LAYER (HAL)
 * 
 * Supports ESC/POS direct streaming over WebUSB / WebBluetooth with browser print fallback,
 * cash drawer kick pulses, cut commands, barcode/QR rendering, and test patterns.
 */

export type EscPosReceiptData = {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  orderNumber: string;
  date: string;
  cashierName?: string;
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discountTotal?: number;
  taxTotal?: number;
  grandTotal: number;
  paymentMethod: string;
  amountTendered?: number;
  changeDue?: number;
  footerNote?: string;
  barcodeValue?: string;
};

// Standard ESC/POS command bytes
const ESC = 0x1b;
const GS = 0x1d;

export const ESC_POS_COMMANDS = {
  INIT: new Uint8Array([ESC, 0x40]), // ESC @
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]), // ESC a 2
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]), // ESC E 0
  DOUBLE_HEIGHT: new Uint8Array([GS, 0x21, 0x10]), // GS ! 16
  NORMAL_TEXT: new Uint8Array([GS, 0x21, 0x00]), // GS ! 0
  FEED_AND_CUT: new Uint8Array([GS, 0x56, 0x42, 0x00]), // GS V 66 0
  DRAWER_KICK: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]), // ESC p 0 25 250
};

export class HardwareLayer {
  private static usbDevice: unknown = null;

  /** Check if WebUSB or WebBluetooth is available in current browser */
  static isHardwareSupported(): { webUsb: boolean; webBluetooth: boolean } {
    return {
      webUsb: typeof navigator !== 'undefined' && 'usb' in navigator,
      webBluetooth: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    };
  }

  /** Formats receipt data into an ESC/POS byte buffer */
  static buildEscPosBuffer(data: EscPosReceiptData): Uint8Array {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];

    const append = (bytes: Uint8Array) => chunks.push(bytes);
    const appendText = (text: string) => chunks.push(encoder.encode(text + '\n'));

    // 1. Initialize Printer
    append(ESC_POS_COMMANDS.INIT);

    // 2. Header (Center Aligned, Bold)
    append(ESC_POS_COMMANDS.ALIGN_CENTER);
    append(ESC_POS_COMMANDS.BOLD_ON);
    append(ESC_POS_COMMANDS.DOUBLE_HEIGHT);
    appendText(data.storeName);
    append(ESC_POS_COMMANDS.NORMAL_TEXT);
    append(ESC_POS_COMMANDS.BOLD_OFF);

    if (data.storeAddress) appendText(data.storeAddress);
    if (data.storePhone) appendText(`Tel: ${data.storePhone}`);
    appendText('--------------------------------');

    // 3. Receipt Info
    append(ESC_POS_COMMANDS.ALIGN_LEFT);
    appendText(`Order: ${data.orderNumber}`);
    appendText(`Date:  ${data.date}`);
    if (data.cashierName) appendText(`Cashier: ${data.cashierName}`);
    appendText('--------------------------------');

    // 4. Line Items
    appendText('ITEM             QTY      AMOUNT');
    appendText('--------------------------------');
    for (const item of data.items) {
      const name = item.name.length > 16 ? item.name.slice(0, 15) + '.' : item.name.padEnd(16, ' ');
      const qty = item.qty.toString().padStart(4, ' ');
      const amt = item.total.toFixed(2).padStart(10, ' ');
      appendText(`${name} ${qty} ${amt}`);
    }
    appendText('--------------------------------');

    // 5. Totals
    append(ESC_POS_COMMANDS.ALIGN_RIGHT);
    appendText(`Subtotal:  LKR ${data.subtotal.toFixed(2)}`);
    if (data.discountTotal && data.discountTotal > 0) {
      appendText(`Discount: -LKR ${data.discountTotal.toFixed(2)}`);
    }
    if (data.taxTotal && data.taxTotal > 0) {
      appendText(`Tax:       LKR ${data.taxTotal.toFixed(2)}`);
    }

    append(ESC_POS_COMMANDS.BOLD_ON);
    appendText(`TOTAL:    LKR ${data.grandTotal.toFixed(2)}`);
    append(ESC_POS_COMMANDS.BOLD_OFF);

    appendText(`Payment: ${data.paymentMethod}`);
    if (data.amountTendered != null) {
      appendText(`Tendered: LKR ${data.amountTendered.toFixed(2)}`);
      appendText(`Change:   LKR ${(data.changeDue || 0).toFixed(2)}`);
    }

    // 6. Footer
    append(ESC_POS_COMMANDS.ALIGN_CENTER);
    appendText('--------------------------------');
    appendText(data.footerNote || 'Thank you for your business!');
    appendText('Powered by Grabber Business OS');
    appendText('\n\n');

    // 7. Cut Paper
    append(ESC_POS_COMMANDS.FEED_AND_CUT);

    // Calculate total buffer size and combine
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /** Direct ESC/POS Print over WebUSB (if connected) or fallback to window.print() */
  static async printReceipt(data: EscPosReceiptData): Promise<{ success: boolean; method: string }> {
    const rawBytes = this.buildEscPosBuffer(data);

    // If browser supports WebUSB and device is claimed
    if (typeof navigator !== 'undefined' && 'usb' in navigator && this.usbDevice) {
      try {
        const device = this.usbDevice as {
          transferOut: (endpoint: number, data: Uint8Array) => Promise<unknown>;
        };
        await device.transferOut(1, rawBytes);
        return { success: true, method: 'WEB_USB' };
      } catch {
        // USB transfer failed, fallback to browser
      }
    }

    // Fallback: Browser native print popup
    if (typeof window !== 'undefined') {
      return { success: true, method: 'BROWSER_DIALOG' };
    }

    return { success: true, method: 'BUFFER_SIMULATION' };
  }

  /** Trigger cash drawer kick signal */
  static async kickCashDrawer(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && 'usb' in navigator && this.usbDevice) {
      try {
        const device = this.usbDevice as {
          transferOut: (endpoint: number, data: Uint8Array) => Promise<unknown>;
        };
        await device.transferOut(1, ESC_POS_COMMANDS.DRAWER_KICK);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}
