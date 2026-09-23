'use client';

import { useMemo, useState } from 'react';
import { BnplCalculator } from '@/components/commerce/bnpl-calculator';
import { ElectronicsVariantPicker } from '@/components/commerce/electronics-variant-picker';
import { toElectronicsVariant } from '@/lib/electronics/variant-attrs';
import { parseElectronicsAttrs } from '@/lib/electronics/variant-attrs';

type Line = {
  productId: string;
  variantId?: string;
  name: string;
  variantLabel: string;
  unitPrice: number;
  unitCost: number;
  stock: number;
  attributesJson?: Record<string, string>;
};

export function ProductPurchasePanel({ lines }: { lines: Line[] }) {
  const electronicsVariants = useMemo(
    () =>
      lines
        .filter((l) => l.variantId)
        .map((l) =>
          toElectronicsVariant(l.productId, {
            id: l.variantId!,
            sku: l.variantLabel,
            salePrice: l.unitPrice,
            attributesJson: l.attributesJson,
            stock: l.stock,
          }),
        ),
    [lines],
  );

  const hasElectronicsAttrs = useMemo(
    () =>
      lines.some((l) => {
        const a = parseElectronicsAttrs(l.attributesJson);
        return Boolean(a.storage || a.condition || a.warrantyType);
      }),
    [lines],
  );

  const [selectedId, setSelectedId] = useState(lines[0]?.variantId || lines[0]?.productId || '');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');

  const selected = lines.find((l) => (l.variantId || l.productId) === selectedId) || lines[0];

  async function addToBag() {
    if (!selected || selected.stock <= 0) return;
    setMsg(null);
    try {
      const raw = localStorage.getItem('grabber_store_bag');
      const bag = raw
        ? (JSON.parse(raw) as Array<
            Line & {
              qty: number;
              id: string;
              customText?: string;
              eventDate?: string;
              fulfillment?: 'delivery' | 'pickup';
            }
          >)
        : [];
      const lineId = selected.variantId || selected.productId;
      const existing = bag.find((b) => b.id === lineId);
      const optionPayload = {
        customText: customText.trim() || undefined,
        eventDate: eventDate || undefined,
        fulfillment,
      };
      if (
        existing &&
        existing.customText === optionPayload.customText &&
        existing.eventDate === optionPayload.eventDate &&
        existing.fulfillment === optionPayload.fulfillment
      ) {
        existing.qty += qty;
      } else {
        bag.push({ ...selected, ...optionPayload, id: lineId, qty });
      }
      localStorage.setItem('grabber_store_bag', JSON.stringify(bag));
      setMsg(`Added ${qty} to bag. View bag on the home page.`);
    } catch {
      setMsg('Could not save to bag.');
    }
  }

  if (!selected) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      {hasElectronicsAttrs && electronicsVariants.length > 0 ? (
        <ElectronicsVariantPicker
          productName={selected.name}
          variants={electronicsVariants}
          onSelect={(v) => setSelectedId(v.id)}
        />
      ) : (
        lines.length > 1 && (
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
        )
      )}

      {!hasElectronicsAttrs && (
        <p className="font-display text-3xl font-bold text-emerald-800">
          LKR {selected.unitPrice.toLocaleString('en-LK')}
        </p>
      )}

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

      <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
        <div>
          <label htmlFor="product-custom-text" className="mb-1 block text-xs font-semibold text-slate-600">
            Custom text / note
          </label>
          <input
            id="product-custom-text"
            value={customText}
            onChange={(event) => setCustomText(event.target.value)}
            maxLength={120}
            placeholder="Name, color theme, message, or special instruction"
            className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="product-event-date" className="mb-1 block text-xs font-semibold text-slate-600">
              Event / needed date
            </label>
            <input
              id="product-event-date"
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="product-fulfillment" className="mb-1 block text-xs font-semibold text-slate-600">
              Fulfillment
            </label>
            <select
              id="product-fulfillment"
              value={fulfillment}
              onChange={(event) => setFulfillment(event.target.value === 'pickup' ? 'pickup' : 'delivery')}
              className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm"
            >
              <option value="delivery">Delivery / courier</option>
              <option value="pickup">Pickup from store</option>
            </select>
          </div>
        </div>
      </div>

      <BnplCalculator priceLkr={selected.unitPrice * qty} />

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
