/**
 * GRABBER BUSINESS OS — HARDWARE BARCODE SCANNER LISTENER
 * Captures hardware keystrokes from USB / Bluetooth 1D/2D Laser Scanners (Honeywell, Zebra, Datalogic, Generic POS).
 * Detects rapid input bursts (< 35ms per character) terminated by 'Enter' (Carriage Return).
 */

export type BarcodeScanHandler = (barcode: string) => void;

export class BarcodeScannerListener {
  private buffer: string = '';
  private lastKeyTime: number = 0;
  private maxIntervalMs: number = 40; // Scanners type within 15-35ms
  private onScan: BarcodeScanHandler;

  constructor(onScan: BarcodeScanHandler) {
    this.onScan = onScan;
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  public attach(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
    }
  }

  public detach(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastKeyTime;

    // Ignore if target is a standard text input/textarea (unless it is the dedicated barcode search field)
    const activeEl = document.activeElement;
    const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
    const isBarcodeField = activeEl?.getAttribute('data-barcode-listener') === 'true';

    if (isInput && !isBarcodeField && timeDiff > 100) {
      return;
    }

    if (e.key === 'Enter') {
      if (this.buffer.length >= 3 && timeDiff < 100) {
        e.preventDefault();
        const scannedCode = this.buffer.trim();
        this.onScan(scannedCode);
      }
      this.buffer = '';
      this.lastKeyTime = 0;
      return;
    }

    // Accumulate characters if fast succession
    if (e.key.length === 1) {
      if (this.buffer.length === 0 || timeDiff < this.maxIntervalMs) {
        this.buffer += e.key;
      } else {
        // Typing too slow (human typist), reset buffer
        this.buffer = e.key;
      }
      this.lastKeyTime = currentTime;
    }
  }
}
