# Print / thermal receipts & barcode labels

**Fixed 2026-09-11:** Blank Chrome print previews were caused by `@media print { .mesh-bg { display: none } }` while AppShell wraps the whole staff UI in `mesh-bg` — so receipts/labels never painted.

## How to print (staff)

### POS receipt (`/pos`)
1. Complete a sale → success modal.
2. Pick **Receipt paper size**: 80mm / 72mm / 58mm (saved in browser).
3. **Print Receipt** → Chrome dialog.
4. More settings → **Margins: None**, uncheck **Headers and footers**.
5. Destination: your thermal printer (or PDF to test).

### Barcode stickers (`/barcodes`)
1. Add SKUs from catalog; set copies.
2. **Label / paper size**: 50×30, 40×30, 58×40, 60×40, A4 24-up / 21-up, or **Custom mm**.
3. **Print N Labels**.
4. Same Chrome tip: no headers/footers, margins none (rolls) or default for A4 sheets.

## Code map

| Piece | Path |
|-------|------|
| Print CSS (no mesh-bg nuke) | `src/app/globals.css` `@media print` |
| Size presets + localStorage | `src/lib/print/paper-sizes.ts` |
| `runPrintJob(mode, { pageSize })` | `src/lib/print/run-print-job.ts` |
| Receipt component | `src/components/pos/thermal-receipt.tsx` |
| Barcode UI | `src/app/barcodes/page.tsx` |

ESC/POS WebUSB/Bluetooth remains in `src/lib/hardware/printer.ts` for direct device print (separate from browser print).
