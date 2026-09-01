'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Barcode, Printer, Plus, Minus, Search } from 'lucide-react';

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

  const handlePrint = () => {
    window.print();
  };

  const totalStickers = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Barcode className="h-5 w-5 text-blue-400" />
            <span>Barcode & Price Sticker Generator</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pull live SKUs from POS catalog — batch print thermal or A4 label sheets.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          disabled={items.length === 0}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 disabled:opacity-50"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print Sticker Sheet ({totalStickers} Labels)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-sm text-foreground">Add from catalog</h3>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, SKU, barcode…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {loading && <p className="text-muted-foreground">Loading catalog…</p>}
            {!loading && filteredCatalog.length === 0 && (
              <p className="text-muted-foreground">No products match. Seed inventory first.</p>
            )}
            {filteredCatalog.slice(0, 20).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => addItem(c)}
                className="w-full text-left p-2 rounded-lg hover:bg-secondary/80 flex justify-between gap-2"
              >
                <span className="font-semibold truncate">{c.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">{c.sku}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="text-muted-foreground block mb-1 font-medium">Sticker Paper Type</label>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value as 'A4_24UP' | 'THERMAL_50X30')}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
            >
              <option value="THERMAL_50X30">Thermal Sticker Roll (50mm x 30mm)</option>
              <option value="A4_24UP">Standard A4 Sheet (24 Labels / Page)</option>
            </select>
          </div>

          <div className="pt-2 border-t border-border/50 space-y-2">
            <h4 className="font-semibold text-foreground">Selected Items ({items.length})</h4>
            {items.length === 0 && <p className="text-muted-foreground">Add products from catalog above.</p>}
            {items.map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-secondary/50 border border-border/40 space-y-2">
                <div className="flex justify-between font-semibold text-foreground">
                  <span>{item.name}</span>
                  <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 text-[10px]">
                    Remove
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {item.variant} · {item.sku}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">Print Copies:</span>
                  <div className="flex items-center bg-card rounded-lg border border-border p-0.5">
                    <button type="button" onClick={() => updateQuantity(item.id, -1)} className="h-5 w-5 rounded flex items-center justify-center">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center font-bold">{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.id, 1)} className="h-5 w-5 rounded flex items-center justify-center">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-foreground">Print Preview Layout</h3>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Select products to preview labels.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.flatMap((item) =>
                Array.from({ length: item.quantity }).map((_, idx) => (
                  <div
                    key={`${item.id}_${idx}`}
                    className="p-3 rounded-xl bg-white text-slate-900 border border-slate-300 shadow-sm flex flex-col justify-between items-center text-center text-xs aspect-[5/3]"
                  >
                    <div className="w-full">
                      <p className="font-extrabold text-[10px] truncate uppercase tracking-tight">GRABBER RETAIL</p>
                      <p className="font-semibold text-[11px] truncate leading-none mt-0.5">{item.name}</p>
                      <p className="text-[9px] text-slate-600 font-medium">{item.variant}</p>
                    </div>
                    <div className="my-1 flex flex-col items-center w-full">
                      <div className="h-6 w-full flex items-center justify-center gap-0.5 px-2">
                        {[1, 0.5, 2, 1, 0.5, 1.5, 1, 0.5, 2].map((w, i) => (
                          <span key={i} className="h-full bg-black" style={{ width: `${w * 4}px` }} />
                        ))}
                      </div>
                      <span className="font-mono text-[9px] font-bold text-slate-700 tracking-wider">{item.barcode}</span>
                    </div>
                    <div className="w-full flex justify-between items-center border-t border-slate-300 pt-1 font-bold text-[11px]">
                      <span className="text-[9px] text-slate-500 font-medium">Inc. VAT</span>
                      <span className="text-slate-950">LKR {item.price.toFixed(2)}</span>
                    </div>
                  </div>
                )),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
