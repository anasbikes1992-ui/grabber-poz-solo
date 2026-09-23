# Print / Thermal Receipts & Barcode Labels

**Fixed 2026-09-11:** Blank Chrome print previews were caused by hiding `.mesh-bg`, the AppShell root that wraps printables.

**Fixed 2026-09-23:** POS receipt printing uses an isolated receipt-only print document. The browser print path no longer prints the whole `/pos` page, preventing runaway previews such as 209/350 sheets.

## How To Print

### POS Receipt (`/pos`)

1. Complete a sale and wait for the success modal.
2. Pick **Receipt paper size**: 80mm, 72mm, or 58mm.
3. Click **Print Receipt**.
4. In Chrome, use **Margins: None** and uncheck **Headers and footers**.
5. Destination can be a thermal printer or Microsoft Print to PDF for testing.

Expected result: one aligned receipt, not the full POS screen.

### Barcode Stickers (`/barcodes`)

1. Add SKUs from catalog and set copies.
2. Pick label size: 50×30, 40×30, 58×40, 60×40, A4 24-up / 21-up, or custom mm.
3. Click **Print N Labels**.
4. Use no headers/footers and margins none for rolls; use normal margins for A4 sheets.

## Code Map

| Piece | Path |
|---|---|
| Print CSS safeguards | `src/app/globals.css` |
| Isolated print helper | `src/lib/print/run-print-job.ts` |
| Size presets + localStorage | `src/lib/print/paper-sizes.ts` |
| Receipt component | `src/components/pos/thermal-receipt.tsx` |
| Legacy browser fallback | `src/lib/hardware/printer.ts` |
| Barcode UI | `src/app/barcodes/page.tsx` |

ESC/POS WebUSB/Bluetooth remains in `src/lib/hardware/printer.ts` for direct device printing.
