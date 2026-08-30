'use client';

import React, { useState } from 'react';
import { Barcode, Printer, Plus, Minus, CheckCircle2 } from 'lucide-react';

interface LabelItem {
  id: string;
  name: string;
  variant: string;
  sku: string;
  barcode: string;
  price: number;
  quantity: number;
}

export default function BarcodeGeneratorPage() {
  const [items, setItems] = useState<LabelItem[]>([
    { id: '1', name: 'Linen Casual Shirt', variant: 'Size L / Blue', sku: 'LNN-SHT-BLU-L', barcode: '8901234567890', price: 4500.0, quantity: 8 },
    { id: '2', name: 'Oxford Button-Down', variant: 'Size M / White', sku: 'OXF-SHT-WHT-M', barcode: '8901234567891', price: 5200.0, quantity: 4 },
  ]);

  const [labelSize, setLabelSize] = useState<'A4_24UP' | 'THERMAL_50X30'>('THERMAL_50X30');

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const totalStickers = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Barcode & Price Sticker Generator</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">
              EAN-13 & Code128
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Batch print barcode labels for thermal sticker rolls or standard A4 adhesive sheets.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print Sticker Sheet ({totalStickers} Labels)</span>
        </button>
      </div>

      {/* Grid: Settings vs Printable Sheet Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Sticker Settings */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-sm text-foreground">Sticker Format Settings</h3>

          <div className="space-y-3">
            <div>
              <label className="text-muted-foreground block mb-1 font-medium">Sticker Paper Type</label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
              >
                <option value="THERMAL_50X30">Thermal Sticker Roll (50mm x 30mm)</option>
                <option value="A4_24UP">Standard A4 Sheet (24 Labels / Page)</option>
              </select>
            </div>

            <div className="pt-2 border-t border-border/50 space-y-2">
              <h4 className="font-semibold text-foreground">Selected Items for Printing</h4>
              {items.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-secondary/50 border border-border/40 space-y-2">
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>{item.name}</span>
                    <span className="font-mono text-[11px]">LKR {item.price.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{item.variant} &bull; {item.sku}</p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">Print Copies:</span>
                    <div className="flex items-center bg-card rounded-lg border border-border p-0.5">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
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

        {/* Right 8 Cols: Visual Label Preview */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-foreground">Print Preview Layout</h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.flatMap((item) =>
              Array.from({ length: item.quantity }).map((_, idx) => (
                <div
                  key={`${item.id}_${idx}`}
                  className="p-3 rounded-xl bg-white text-slate-900 border border-slate-300 shadow-sm flex flex-col justify-between items-center text-center text-xs aspect-[5/3]"
                >
                  <div className="w-full">
                    <p className="font-extrabold text-[10px] truncate uppercase tracking-tight text-slate-900">
                      GRABBER RETAIL
                    </p>
                    <p className="font-semibold text-[11px] truncate text-slate-800 leading-none mt-0.5">
                      {item.name}
                    </p>
                    <p className="text-[9px] text-slate-600 font-medium">{item.variant}</p>
                  </div>

                  {/* Simulated High-Res Barcode */}
                  <div className="my-1 flex flex-col items-center w-full">
                    <div className="h-6 w-full flex items-center justify-center gap-0.5 px-2">
                      <span className="h-full w-1 bg-black" />
                      <span className="h-full w-0.5 bg-black" />
                      <span className="h-full w-2 bg-black" />
                      <span className="h-full w-1 bg-black" />
                      <span className="h-full w-0.5 bg-black" />
                      <span className="h-full w-1.5 bg-black" />
                      <span className="h-full w-1 bg-black" />
                      <span className="h-full w-0.5 bg-black" />
                      <span className="h-full w-2 bg-black" />
                    </div>
                    <span className="font-mono text-[9px] font-bold text-slate-700 tracking-wider">
                      {item.barcode}
                    </span>
                  </div>

                  <div className="w-full flex justify-between items-center border-t border-slate-300 pt-1 font-bold text-[11px]">
                    <span className="text-[9px] text-slate-500 font-medium font-sans">Inc. 18% VAT</span>
                    <span className="text-slate-950">LKR {item.price.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
