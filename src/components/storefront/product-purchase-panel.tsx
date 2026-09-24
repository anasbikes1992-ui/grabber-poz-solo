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
      window.dispatchEvent(new Event('grabber:bag-updated'));
      setMsg(`Added ${qty} to bag. View bag on the home page.`);
    } catch {
      setMsg('Could not save to bag.');
    }
  }

  if (!selected) return null;

  return (
    <div className="space-y-4 rounded-3xl border border-[var(--sf-border)] bg-[var(--sf-surface)] p-5 shadow-xl shadow-[var(--sf-primary)]/5 backdrop-blur sm:p-6">
      {hasElectronicsAttrs && electronicsVariants.length > 0 ? (
        <ElectronicsVariantPicker
          productName={selected.name}
          variants={electronicsVariants}
          onSelect={(v) => setSelectedId(v.id)}
        />
      ) : (
        lines.length > 1 && (
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--sf-secondary)]">
              Select variant
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-background)] px-3 py-2.5 text-sm text-[var(--sf-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
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
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {lines.slice(0, 12).map((l) => {
                const id = l.variantId || l.productId;
                const active = id === selectedId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={`min-h-11 rounded-2xl border px-3 py-2 text-left text-xs transition ${
                      active
                        ? 'border-[var(--sf-accent)] bg-[var(--sf-accent)] text-[var(--sf-on-accent)] shadow-sm'
                        : 'border-[var(--sf-border)] bg-[var(--sf-background)] text-[var(--sf-foreground)] hover:border-[var(--sf-accent)]'
                    }`}
                  >
                    <span className="block font-bold">{l.variantLabel}</span>
                    <span className={active ? 'opacity-85' : 'text-[var(--sf-secondary)]'}>
                      LKR {l.unitPrice.toLocaleString('en-LK')} · {l.stock} left
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      {!hasElectronicsAttrs && (
        <p className="font-display text-3xl font-bold text-[var(--sf-accent)]">
          LKR {selected.unitPrice.toLocaleString('en-LK')}
        </p>
      )}

      <p className="text-sm text-[var(--sf-secondary)]">
        {selected.stock > 0 ? `${selected.stock} in stock` : 'Out of stock'}
      </p>

      <div className="flex items-center gap-2">
        <label className="text-sm text-[var(--sf-secondary)]">Qty</label>
        <input
          type="number"
          min={1}
          max={Math.max(1, selected.stock)}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="w-20 rounded-lg border border-[var(--sf-border)] bg-[var(--sf-background)] px-2 py-1.5 text-sm text-[var(--sf-foreground)]"
        />
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--sf-accent)]/20 bg-[var(--sf-accent)]/10 p-4">
        <div>
          <label htmlFor="product-custom-text" className="mb-1 block text-xs font-semibold text-[var(--sf-foreground)]">
            Custom text / note
          </label>
          <input
            id="product-custom-text"
            value={customText}
            onChange={(event) => setCustomText(event.target.value)}
            maxLength={120}
            placeholder="Name, color theme, message, or special instruction"
            className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-background)] px-3 py-2 text-sm text-[var(--sf-foreground)]"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="product-event-date" className="mb-1 block text-xs font-semibold text-[var(--sf-foreground)]">
              Event / needed date
            </label>
            <input
              id="product-event-date"
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-background)] px-3 py-2 text-sm text-[var(--sf-foreground)]"
            />
          </div>
          <div>
            <label htmlFor="product-fulfillment" className="mb-1 block text-xs font-semibold text-[var(--sf-foreground)]">
              Fulfillment
            </label>
            <select
              id="product-fulfillment"
              value={fulfillment}
              onChange={(event) => setFulfillment(event.target.value === 'pickup' ? 'pickup' : 'delivery')}
              className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-background)] px-3 py-2 text-sm text-[var(--sf-foreground)]"
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
        className="min-h-12 w-full rounded-full bg-[var(--sf-primary)] py-3 text-sm font-semibold text-[var(--sf-on-primary)] shadow-lg shadow-[var(--sf-primary)]/20 transition hover:opacity-90 disabled:opacity-40"
      >
        Add to bag
      </button>
      {msg && (
        <p className="text-sm font-semibold text-[var(--sf-accent)]" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
