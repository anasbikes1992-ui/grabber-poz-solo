'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Barcode, Printer, Plus, Minus, Search, Layers, RefreshCw } from 'lucide-react';
import { BarcodeSVG } from '@/components/common/barcode-svg';

type CatalogItem = {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  barcode: string;
  unitPrice: number;
  variant: string;
};

type LabelItem = {
  id: string;
  name: string;
  variant: string;
  sku: string;
  barcode: string;
  price: number;
  quantity: number;
};

export default function BarcodeGeneratorPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [items, setItems] = useState<LabelItem[]>([]);
  const [labelSize, setLabelSize] = useState<'A4_24UP' | 'THERMAL_50X30'>('THERMAL_50X30');
  const [storeName, setStoreName] = useState('Grabber Store');
  const [currencySymbol, setCurrencySymbol] = useState('LKR');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pos/catalog')
      .then((r) => r.json())
      .then((d) => setCatalog(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredCatalog = catalog.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.sku.toLowerCase().includes(query.toLowerCase()) ||
      c.barcode.includes(query),
  );

  const addItem = useCallback((c: CatalogItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === c.id);
      if (existing) {
        return prev.map((i) => (i.id === c.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          id: c.id,
          name: c.name,
          variant: c.variant || 'Standard',
          sku: c.sku,
          barcode: c.barcode || c.sku,
          price: c.unitPrice,
          quantity: 1,
        },
      ];
    });
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const addMatrixVariants = useCallback(() => {
    const matrixItems = catalog.filter((c) => c.variantId && c.variant && c.variant !== 'Standard');
    if (!matrixItems.length) {
      setQuery('');
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      for (const c of matrixItems) {
        const idx = next.findIndex((i) => i.id === c.id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        } else {
          next.push({
            id: c.id,
            name: c.name,
            variant: c.variant || 'Standard',
            sku: c.sku,
            barcode: c.barcode || c.sku,
            price: c.unitPrice,
            quantity: 1,
          });
        }
      }
      return next;
    });
  }, [catalog]);

  const handlePrint = () => {
    window.print();
  };

  const totalStickers = items.reduce((sum, i) => sum + i.quantity, 0);

  // Flatten items by quantity for printing & preview
  const flatLabels = items.flatMap((item) =>
    Array.from({ length: item.quantity }).map((_, idx) => ({
      ...item,
      labelKey: `${item.id}_${idx}`,
    })),
  );

  return (
    <div className="space-y-6">
      {/* Dynamic Print Page Size Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${labelSize === 'THERMAL_50X30' ? '50mm 30mm' : 'A4 portrait'};
            margin: ${labelSize === 'THERMAL_50X30' ? '0' : '8mm 6mm'};
          }
        }
      `}</style>

      {/* Screen-only Header */}
      <div className="no-print print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Barcode className="h-5 w-5 text-blue-400" />
            <span>Barcode & Price Sticker Designer</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Batch generate and print 50mm x 30mm thermal rolls or 24-up A4 label sheets with sharp Code128 barcodes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setItems([])}
              className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition"
            >
              Clear All
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            disabled={items.length === 0}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer btn-press"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print {totalStickers} Label{totalStickers !== 1 ? 's' : ''}</span>
          </button>
        </div>
      </div>

      {/* Screen Layout: Controls & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print print:hidden">
        {/* Left Column: Catalog & Config */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
            <span>Add Products</span>
            <span className="text-[11px] font-normal text-muted-foreground">{catalog.length} in catalog</span>
          </h3>

          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, SKU, barcode…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border text-foreground outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={addMatrixVariants}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold text-[11px] flex items-center justify-center gap-1.5 transition"
            >
              <Layers className="h-3 w-3 text-emerald-400" />
              <span>Load Variants</span>
            </button>
            <button
              type="button"
              onClick={() => {
                filteredCatalog.forEach((c) => addItem(c));
              }}
              disabled={loading || filteredCatalog.length === 0}
              className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold text-[11px] transition"
            >
              Add All ({filteredCatalog.length})
            </button>
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
            {loading && <p className="text-muted-foreground p-2">Loading catalog…</p>}
            {!loading && filteredCatalog.length === 0 && (
              <p className="text-muted-foreground p-2">No matching products found.</p>
            )}
            {filteredCatalog.slice(0, 30).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => addItem(c)}
                className="w-full text-left p-2 rounded-lg hover:bg-secondary transition flex justify-between items-center gap-2 group"
              >
                <div className="truncate">
                  <p className="font-semibold truncate text-foreground group-hover:text-emerald-400 transition">
                    {c.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{c.variant || 'Standard'} · {c.sku}</p>
                </div>
                <span className="font-mono text-[10px] font-bold text-foreground shrink-0">
                  {currencySymbol} {c.unitPrice.toFixed(0)}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-border/60 pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium text-[11px]">Store Header</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. GRABBER RETAIL"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-secondary border border-border text-foreground font-medium text-xs"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1 font-medium text-[11px]">Currency</label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="LKR / USD / EUR"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-secondary border border-border text-foreground font-medium text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-muted-foreground block mb-1 font-medium">Sticker Paper Format</label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value as 'A4_24UP' | 'THERMAL_50X30')}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="THERMAL_50X30">Thermal Roll Sticker (50mm x 30mm) — 1 label / page</option>
                <option value="A4_24UP">Standard A4 Sheet (24 Labels / Page — 3 x 8 Grid)</option>
              </select>
            </div>
          </div>

          <div className="border-t border-border/60 pt-3 space-y-2">
            <div className="flex justify-between items-center font-semibold text-foreground">
              <span>Selected Products ({items.length})</span>
              <span className="text-[11px] text-emerald-400 font-bold">{totalStickers} total labels</span>
            </div>
            {items.length === 0 && (
              <p className="text-muted-foreground text-center py-4">Click products above to add labels.</p>
            )}
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {items.map((item) => (
                <div key={item.id} className="p-2.5 rounded-xl bg-secondary/50 border border-border/50 space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div className="truncate">
                      <span className="font-semibold text-foreground truncate block">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.variant} · {item.sku}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-red-400 hover:text-red-300 text-[10px] font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {currencySymbol} {item.price.toFixed(2)}
                    </span>
                    <div className="flex items-center bg-card rounded-lg border border-border p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-5 w-5 rounded flex items-center justify-center hover:bg-secondary text-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-foreground">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-5 w-5 rounded flex items-center justify-center hover:bg-secondary text-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Preview */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Print Preview Layout</h3>
            <span className="text-xs text-muted-foreground">
              Format: {labelSize === 'THERMAL_50X30' ? '50mm × 30mm Roll' : 'A4 (3×8 Grid)'}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-border/60 rounded-xl space-y-2">
              <Barcode className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground">No labels selected.</p>
              <p className="text-xs text-muted-foreground/70">
                Search and add items from the catalog on the left to view the live print preview.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[620px] overflow-y-auto p-2 bg-zinc-950/40 rounded-xl border border-border/40">
              {flatLabels.map((item) => (
                <div
                  key={item.labelKey}
                  className="p-2.5 rounded-lg bg-white text-black border border-slate-300 shadow-sm flex flex-col justify-between items-center text-center aspect-[50/30] select-none"
                >
                  <div className="w-full">
                    <p className="font-bold text-[9px] truncate uppercase tracking-tight text-slate-800 leading-none">
                      {storeName || 'GRABBER RETAIL'}
                    </p>
                    <p className="font-bold text-[10px] truncate leading-tight mt-0.5 text-black">
                      {item.name}
                    </p>
                    <p className="text-[8px] text-slate-600 truncate leading-none">
                      {item.variant} · {item.sku}
                    </p>
                  </div>

                  <div className="my-0.5 flex flex-col items-center w-full justify-center">
                    <BarcodeSVG
                      value={item.barcode || item.sku}
                      format="CODE128"
                      height={20}
                      width={1.2}
                      displayValue={false}
                      className="mx-auto"
                    />
                    <span className="font-mono text-[8px] font-bold text-slate-900 tracking-wider leading-none mt-0.5">
                      {item.barcode || item.sku}
                    </span>
                  </div>

                  <div className="w-full flex justify-between items-center border-t border-slate-200 pt-0.5 font-bold text-[10px] leading-none">
                    <span className="text-[7.5px] text-slate-500 uppercase font-medium">Inc. VAT</span>
                    <span className="text-black font-extrabold">{currencySymbol} {item.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          PRINT-ONLY RENDER CONTAINER (Isolated from page chrome)
          ========================================================================= */}
      {items.length > 0 && (
        <div id="printable-barcode-sheet" className="hidden print:block">
          {labelSize === 'THERMAL_50X30' ? (
            /* Thermal Continuous Roll: 1 label per page, exactly 50mm x 30mm */
            <div className="space-y-0">
              {flatLabels.map((item) => (
                <div
                  key={item.labelKey}
                  className="label-thermal-50x30 flex flex-col justify-between items-center text-center font-sans"
                  style={{
                    width: '50mm',
                    height: '30mm',
                    maxWidth: '50mm',
                    maxHeight: '30mm',
                    padding: '1.2mm 2mm',
                    boxSizing: 'border-box',
                    pageBreakAfter: 'always',
                    breakAfter: 'page',
                    overflow: 'hidden',
                  }}
                >
                  <div className="w-full text-center">
                    <div className="font-extrabold text-[8px] tracking-tight uppercase truncate leading-none">
                      {storeName || 'GRABBER RETAIL'}
                    </div>
                    <div className="font-bold text-[9.5px] leading-tight truncate mt-0.5">
                      {item.name}
                    </div>
                    <div className="text-[7.5px] text-gray-700 leading-none truncate">
                      {item.variant !== 'Standard' ? `${item.variant} · ` : ''}{item.sku}
                    </div>
                  </div>

                  <div className="w-full flex flex-col items-center justify-center my-0.5">
                    <BarcodeSVG
                      value={item.barcode || item.sku}
                      format="CODE128"
                      height={18}
                      width={1.1}
                      displayValue={false}
                      className="mx-auto"
                    />
                    <span className="font-mono text-[7.5px] font-bold tracking-wider leading-none mt-0.5">
                      {item.barcode || item.sku}
                    </span>
                  </div>

                  <div className="w-full flex justify-between items-baseline border-t border-black pt-0.5 leading-none">
                    <span className="text-[7px] uppercase font-semibold text-gray-700">Incl. VAT</span>
                    <span className="font-extrabold text-[10px]">
                      {currencySymbol} {item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* A4 Sheet 24-up: 3 columns x 8 rows per sheet */
            <div
              className="grid grid-cols-3 gap-2"
              style={{
                width: '190mm',
                margin: '0 auto',
                boxSizing: 'border-box',
              }}
            >
              {flatLabels.map((item) => (
                <div
                  key={item.labelKey}
                  className="label-a4-24up p-2 border border-black/80 flex flex-col justify-between items-center text-center font-sans"
                  style={{
                    height: '33.5mm',
                    maxHeight: '33.5mm',
                    boxSizing: 'border-box',
                    breakInside: 'avoid',
                    pageBreakInside: 'avoid',
                  }}
                >
                  <div className="w-full">
                    <div className="font-extrabold text-[8.5px] uppercase truncate leading-none">
                      {storeName || 'GRABBER RETAIL'}
                    </div>
                    <div className="font-bold text-[10px] truncate leading-tight mt-0.5">
                      {item.name}
                    </div>
                    <div className="text-[8px] text-gray-700 leading-none truncate">
                      {item.variant !== 'Standard' ? `${item.variant} · ` : ''}{item.sku}
                    </div>
                  </div>

                  <div className="w-full flex flex-col items-center justify-center my-0.5">
                    <BarcodeSVG
                      value={item.barcode || item.sku}
                      format="CODE128"
                      height={20}
                      width={1.2}
                      displayValue={false}
                      className="mx-auto"
                    />
                    <span className="font-mono text-[8px] font-bold tracking-wider leading-none mt-0.5">
                      {item.barcode || item.sku}
                    </span>
                  </div>

                  <div className="w-full flex justify-between items-baseline border-t border-black pt-0.5 leading-none">
                    <span className="text-[7.5px] uppercase font-semibold text-gray-700">Incl. VAT</span>
                    <span className="font-extrabold text-[10.5px]">
                      {currencySymbol} {item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
