'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { Utensils, Plus, Minus, CheckCircle, Send } from 'lucide-react';

type MenuItem = {
  id: string;
  name: string;
  salePrice: number;
  description?: string | null;
  category: string;
};

export default function TableQrMenuPage() {
  const params = useParams();
  const token = String(params?.tableToken || '');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tableName, setTableName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tray, setTray] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sentKot, setSentKot] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void fetch(`/api/restaurant/menu?table=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || 'Failed');
        setItems(d.items || []);
        setTableName(d.table?.name || null);
        if (!d.table) setError('Unknown table QR — ask staff for a new code.');
      })
      .catch((e) => setError(e.message));
  }, [token]);

  const updateQty = (id: string, delta: number) => {
    setTray((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const trayCount = Object.values(tray).reduce((a, b) => a + b, 0);
  const trayTotal = Object.entries(tray).reduce((sum, [id, qty]) => {
    const item = items.find((i) => i.id === id);
    return sum + (item ? item.salePrice * qty : 0);
  }, 0);

  const handleSendOrder = async () => {
    if (!token || trayCount === 0 || sending) return;
    setSending(true);
    setError(null);
    try {
      const orderItems = Object.entries(tray).map(([id, qty]) => ({
        productId: id,
        qty,
      }));

      const res = await fetch('/api/restaurant/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableToken: token,
          items: orderItems,
          guestNotes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to send order');
      setSentKot(data.kotNumber);
      setTray({});
      setNotes('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <StorefrontShell>
      <section className="mx-auto max-w-2xl px-4 py-8 pb-32">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full w-fit mb-3">
          <Utensils className="h-3.5 w-3.5" />
          <span>{tableName || 'Table Dine-In'}</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Dine-In Menu</h1>
        <p className="mt-1 text-sm text-[var(--sf-secondary)]">
          Select your dishes below and send your order directly to the kitchen display.
        </p>

        {sentKot && (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3"
          >
            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="font-bold text-sm">Order sent to kitchen! (Ticket #{sentKot})</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Our kitchen has received your order for {tableName}. You can order more items anytime.
              </p>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {items.map((item) => {
            const qty = tray[item.id] || 0;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-zinc-100 bg-white hover:border-zinc-200 transition shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-zinc-900 truncate">{item.name}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{item.category}</p>
                  <p className="font-mono text-sm font-bold text-zinc-900 mt-1">
                    LKR {Number(item.salePrice).toLocaleString('en-LK')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 bg-zinc-50 p-1 rounded-xl border border-zinc-200/80">
                  {qty > 0 ? (
                    <>
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => updateQty(item.id, -1)}
                        className="h-7 w-7 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 transition shadow-xs"
                      >
                        <Minus className="h-3 w-3" aria-hidden />
                      </button>
                      <span className="font-mono font-bold text-xs w-5 text-center" aria-live="polite">
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        onClick={() => updateQty(item.id, 1)}
                        className="h-7 w-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center hover:bg-black transition shadow-xs"
                      >
                        <Plus className="h-3 w-3" aria-hidden />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Add ${item.name} to tray`}
                      onClick={() => updateQty(item.id, 1)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold flex items-center gap-1 hover:bg-black transition shadow-xs"
                    >
                      <Plus className="h-3 w-3" aria-hidden />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-100 flex justify-between items-center text-xs text-zinc-500">
          <Link href="/shop/menu" className="underline hover:text-zinc-900 transition">
            View full restaurant menu
          </Link>
          <span>Powered by Grabber POZ</span>
        </div>
      </section>

      {/* Floating Order Tray Bar */}
      {trayCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-zinc-200/80 shadow-2xl z-40 max-w-2xl mx-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span className="font-medium">{trayCount} item(s) in tray</span>
              <span className="font-mono font-bold text-sm text-zinc-900">
                LKR {trayTotal.toLocaleString('en-LK')}
              </span>
            </div>
            <label className="sr-only" htmlFor="dine-table-notes">
              Table notes
            </label>
            <input
              id="dine-table-notes"
              type="text"
              placeholder="Table notes (e.g. extra spicy, no ice)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            <button
              type="button"
              disabled={sending}
              aria-busy={sending}
              onClick={() => void handleSendOrder()}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
              <span>{sending ? 'Sending to Kitchen...' : `Send Order to Kitchen (LKR ${trayTotal.toLocaleString('en-LK')})`}</span>
            </button>
          </div>
        </div>
      )}
    </StorefrontShell>
  );
}
