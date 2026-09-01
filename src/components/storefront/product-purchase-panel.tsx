'use client';

import { useState } from 'react';

type Line = {
  productId: string;
  variantId?: string;
  name: string;
  variantLabel: string;
  unitPrice: number;
  unitCost: number;
  stock: number;
};

export function ProductPurchasePanel({ lines }: { lines: Line[] }) {
  const [selectedId, setSelectedId] = useState(lines[0]?.variantId || lines[0]?.productId || '');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);

  const selected = lines.find((l) => (l.variantId || l.productId) === selectedId) || lines[0];

  async function addToBag() {
    if (!selected || selected.stock <= 0) return;
    setMsg(null);
    try {
      const raw = localStorage.getItem('grabber_store_bag');
      const bag = raw ? (JSON.parse(raw) as Array<Line & { qty: number; id: string }>) : [];
      const lineId = selected.variantId || selected.productId;
      const existing = bag.find((b) => b.id === lineId);
      if (existing) existing.qty += qty;
      else bag.push({ ...selected, id: lineId, qty });
      localStorage.setItem('grabber_store_bag', JSON.stringify(bag));
      setMsg(`Added ${qty} to bag. View bag on the home page.`);
    } catch {
      setMsg('Could not save to bag.');
    }
  }

  if (!selected) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      {lines.length > 1 && (
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Select variant</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {lines.map((l) => {
              const id = l.variantId || l.productId;
              return (
                <option key={id} value={id}>
                  {l.variantLabel} — LKR {l.unitPrice.toLocaleString()} ({l.stock} in stock)
                </option>
              );
            })}
          </select>
        </div>
      )}
      <p className="font-display text-3xl font-bold text-emerald-800">
        LKR {selected.unitPrice.toLocaleString('en-LK')}
      </p>
      <p className="text-sm text-slate-500">
        {selected.stock > 0 ? `${selected.stock} in stock` : 'Out of stock'}
      </p>
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">Qty</label>
        <input
          type="number"
          min={1}
          max={Math.max(1, selected.stock)}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
      </div>
      <button
        type="button"
        disabled={selected.stock <= 0}
        onClick={() => void addToBag()}
        className="w-full rounded-full bg-emerald-700 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
      >
        Add to bag
      </button>
      {msg && (
        <p className="text-sm text-emerald-700" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
