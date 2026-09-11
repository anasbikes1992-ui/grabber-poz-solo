'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Barcode, Printer, Plus, Minus, Search, Layers } from 'lucide-react';
import { BarcodeSVG } from '@/components/common/barcode-svg';
import {
  LABEL_PAPER_PRESETS,
  type LabelPaperId,
  readCustomLabelMm,
  readLabelPaperId,
  resolveLabelSize,
  writeCustomLabelMm,
  writeLabelPaperId,
} from '@/lib/print/paper-sizes';
import { runPrintJob } from '@/lib/print/run-print-job';

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
  const [labelSize, setLabelSize] = useState<LabelPaperId>('THERMAL_50X30');
  const [customMm, setCustomMm] = useState({ widthMm: 50, heightMm: 30 });
  const [storeName, setStoreName] = useState('Grabber Store');
  const [currencySymbol, setCurrencySymbol] = useState('LKR');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLabelSize(readLabelPaperId());
    setCustomMm(readCustomLabelMm());
  }, []);

  useEffect(() => {
    fetch('/api/pos/catalog')
      .then((r) => r.json())
      .then((d) => setCatalog(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const size = useMemo(
    () => resolveLabelSize(labelSize, customMm),
    [labelSize, customMm],
  );

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

  const handlePaperChange = (id: LabelPaperId) => {
    setLabelSize(id);
    writeLabelPaperId(id);
  };

  const handleCustomChange = (patch: Partial<{ widthMm: number; heightMm: number }>) => {
    setCustomMm((prev) => {
      const next = {
        widthMm: patch.widthMm ?? prev.widthMm,
        heightMm: patch.heightMm ?? prev.heightMm,
      };
      writeCustomLabelMm(next.widthMm, next.heightMm);
      return next;
    });
  };

  const handlePrint = () => {
    if (!items.length) return;
    if (size.isA4) {
      runPrintJob('labels', { pageSize: 'A4', margin: '6mm 5mm' });
    } else {
      runPrintJob('labels', {
        pageSize: `${size.widthMm}mm ${size.heightMm}mm`,
        margin: '0',
      });
    }
  };

  const totalStickers = items.reduce((sum, i) => sum + i.quantity, 0);

  const flatLabels = items.flatMap((item) =>
    Array.from({ length: item.quantity }).map((_, idx) => ({
      ...item,
      labelKey: `${item.id}_${idx}`,
    })),
  );

  const barcodeHeight = Math.max(14, Math.min(28, Math.round(size.heightMm * 0.35)));
  const barcodeWidth = size.widthMm < 45 ? 1.0 : size.widthMm < 55 ? 1.1 : 1.25;

  const LabelFace = ({
    item,
    forPrint,
    isLast,
  }: {
    item: (typeof flatLabels)[0];
    forPrint?: boolean;
    isLast?: boolean;
  }) => (
    <div
      className={
        forPrint
          ? size.isA4
            ? 'label-a4-cell flex flex-col justify-between items-center text-center font-sans border border-black/80'
            : 'label-thermal-roll flex flex-col justify-between items-center text-center font-sans'
          : 'flex flex-col justify-between items-center text-center font-sans bg-white text-black border border-slate-300 shadow-sm rounded-lg'
      }
      style={{
        width: size.isA4 ? '100%' : `${size.widthMm}mm`,
        height: `${size.heightMm}mm`,
        maxWidth: size.isA4 ? undefined : `${size.widthMm}mm`,
        maxHeight: `${size.heightMm}mm`,
        padding: size.heightMm < 28 ? '1mm 1.5mm' : '1.5mm 2mm',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        ...(forPrint && !size.isA4
          ? !isLast
            ? { pageBreakAfter: 'always' as const, breakAfter: 'page' as const }
            : { pageBreakAfter: 'avoid' as const, breakAfter: 'avoid' as const }
          : {}),
      }}
    >
      <div className="w-full text-center">
        <div
          className="font-extrabold tracking-tight uppercase truncate leading-none"
          style={{ fontSize: size.heightMm < 28 ? '7px' : '8px' }}
        >
          {storeName || 'GRABBER RETAIL'}
        </div>
        <div
          className="font-bold leading-tight truncate mt-0.5"
          style={{ fontSize: size.heightMm < 28 ? '8.5px' : '9.5px' }}
        >
          {item.name}
        </div>
        <div className="text-gray-700 leading-none truncate" style={{ fontSize: '7.5px' }}>
          {item.variant !== 'Standard' ? `${item.variant} · ` : ''}
          {item.sku}
        </div>
      </div>

      <div className="w-full flex flex-col items-center justify-center my-0.5">
        <BarcodeSVG
          value={item.barcode || item.sku}
          format="CODE128"
          height={barcodeHeight}
          width={barcodeWidth}
          displayValue={false}
          className="mx-auto"
        />
        <span
          className="font-mono font-bold tracking-wider leading-none mt-0.5"
          style={{ fontSize: '7.5px' }}
        >
          {item.barcode || item.sku}
        </span>
      </div>

      <div className="w-full flex justify-between items-baseline border-t border-black pt-0.5 leading-none">
        <span className="uppercase font-semibold text-gray-700" style={{ fontSize: '7px' }}>
          Incl. VAT
        </span>
        <span className="font-extrabold" style={{ fontSize: size.heightMm < 28 ? '9px' : '10px' }}>
          {currencySymbol} {item.price.toFixed(2)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="no-print print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Barcode className="h-5 w-5 text-blue-400" />
            <span>Barcode & Price Sticker Designer</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Batch print thermal rolls or A4 sheets. Choose a preset or custom mm size — Chrome: turn off
            &quot;Headers and footers&quot; in print → More settings.
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
            <span>
              Print {totalStickers} Label{totalStickers !== 1 ? 's' : ''}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print print:hidden">
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
                  <p className="text-[10px] text-muted-foreground">
                    {c.variant || 'Standard'} · {c.sku}
                  </p>
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
                <label className="text-muted-foreground block mb-1 font-medium text-[11px]" htmlFor="bc-store">
                  Store Header
                </label>
                <input
                  id="bc-store"
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. GRABBER RETAIL"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-secondary border border-border text-foreground font-medium text-xs"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1 font-medium text-[11px]" htmlFor="bc-currency">
                  Currency
                </label>
                <input
                  id="bc-currency"
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="LKR / USD / EUR"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-secondary border border-border text-foreground font-medium text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-muted-foreground block mb-1 font-medium" htmlFor="bc-paper">
                Label / paper size
              </label>
              <select
                id="bc-paper"
                value={labelSize}
                onChange={(e) => handlePaperChange(e.target.value as LabelPaperId)}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {LABEL_PAPER_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                {LABEL_PAPER_PRESETS.find((p) => p.id === labelSize)?.description}
              </p>
            </div>

            {labelSize === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium text-[11px]" htmlFor="bc-w">
                    Width (mm)
                  </label>
                  <input
                    id="bc-w"
                    type="number"
                    min={20}
                    max={120}
                    step={1}
                    value={customMm.widthMm}
                    onChange={(e) => handleCustomChange({ widthMm: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-secondary border border-border text-foreground font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium text-[11px]" htmlFor="bc-h">
                    Height (mm)
                  </label>
                  <input
                    id="bc-h"
                    type="number"
                    min={15}
                    max={100}
                    step={1}
                    value={customMm.heightMm}
                    onChange={(e) => handleCustomChange({ heightMm: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-secondary border border-border text-foreground font-mono text-xs"
                  />
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground rounded-lg bg-secondary/60 px-2.5 py-2">
              Active size: <strong className="text-foreground font-mono">{size.widthMm}×{size.heightMm}mm</strong>
              {size.isA4 ? ` · ${size.cols} cols / A4` : ' · 1 label / page (roll)'}
            </p>
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
                        aria-label={`Decrease copies of ${item.name}`}
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-5 w-5 rounded flex items-center justify-center hover:bg-secondary text-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-foreground">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase copies of ${item.name}`}
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

        <div className="lg:col-span-8 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Print Preview Layout</h3>
            <span className="text-xs text-muted-foreground font-mono">
              {size.widthMm}×{size.heightMm}mm
            </span>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-border/60 rounded-xl space-y-2">
              <Barcode className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground">No labels selected.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 max-h-[620px] overflow-y-auto p-3 bg-zinc-950/40 rounded-xl border border-border/40 content-start">
              {flatLabels.map((item) => (
                <LabelFace key={item.labelKey} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div id="printable-barcode-sheet" className="hidden print:block">
          {size.isA4 ? (
            <div
              className="grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${size.cols}, 1fr)`,
                width: '200mm',
                margin: '0 auto',
                boxSizing: 'border-box',
              }}
            >
              {flatLabels.map((item, idx) => (
                <LabelFace key={item.labelKey} item={item} forPrint isLast={idx === flatLabels.length - 1} />
              ))}
            </div>
          ) : (
            <div>
              {flatLabels.map((item, idx) => (
                <LabelFace key={item.labelKey} item={item} forPrint isLast={idx === flatLabels.length - 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
