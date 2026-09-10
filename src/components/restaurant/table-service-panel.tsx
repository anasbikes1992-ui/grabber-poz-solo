'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { UtensilsCrossed, AlertCircle, CheckCircle2, ChefHat } from 'lucide-react';

export type KotTicket = {
  id: string;
  kotNumber: string;
  tableId: string | null;
  waiterName: string | null;
  itemsJson: Array<{ name: string; qty: number; price: number; notes?: string }>;
  totalAmount: string;
  status: string;
  createdAt: string;
};

export type TableRow = {
  id: string;
  name: string;
  capacity: number;
  status: string;
  activeOrder?: {
    kotNumber: string;
    items: Array<{ name: string; qty: number; price: number }>;
    total: number;
    waiter: string;
    ticketId: string;
  };
};

export type TableServiceCartLine = {
  productId?: string;
  name: string;
  qty: number;
  price: number;
  notes?: string;
  /** VERT-R04 */
  modifiers?: Array<{
    name: string;
    priceDelta?: number;
    ingredientProductId?: string;
    ingredientQty?: number;
  }>;
};

type Props = {
  /** When set, "Fire KOT" uses these lines instead of the demo item. */
  cartLines?: TableServiceCartLine[];
  onKotSuccess?: () => void;
  /** Compact layout for embedding inside POS */
  embedded?: boolean;
};

export function TableServicePanel({ cartLines, onKotSuccess, embedded }: Props) {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [tickets, setTickets] = useState<KotTicket[]>([]);
  const [selected, setSelected] = useState<TableRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [payMethod, setPayMethod] = useState<'CASH' | 'CARD' | 'SPLIT'>('CASH');
  const [splitSeats, setSplitSeats] = useState(1);
  const [cashAmt, setCashAmt] = useState('');
  const [cardAmt, setCardAmt] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/restaurant');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Load failed');
    setTables(data.tables || []);
    setTickets(data.tickets || []);
    setSelected((prev) => {
      if (prev) {
        const next = (data.tables || []).find((t: TableRow) => t.id === prev.id);
        return next || data.tables?.[0] || null;
      }
      return data.tables?.[0] || null;
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await fetch('/api/restaurant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'seed_floor' }),
        });
        await load();
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [load]);

  const setStatus = async (tableId: string, status: string) => {
    setError(null);
    try {
      const res = await fetch('/api/restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_status', tableId, status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setNote(`Table → ${status}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const createKot = async () => {
    if (!selected) return;
    const items =
      cartLines && cartLines.length > 0
        ? cartLines.map((l) => ({
            productId: l.productId,
            name: l.name,
            qty: l.qty,
            price: l.price,
            notes: l.notes,
            modifiers: l.modifiers,
          }))
        : [
            {
              name: 'House Special',
              qty: 1,
              price: 1500,
              notes: 'Demo KOT',
              modifiers: [{ name: 'Extra chili', priceDelta: 50 }],
            },
          ];

    setBusy(true);
    setError(null);
    try {
      await fetch('/api/restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_status', tableId: selected.id, status: 'ORDERED' }),
      });
      const res = await fetch('/api/restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_kot',
          tableId: selected.id,
          waiterName: embedded ? 'POS' : 'Floor',
          items,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setNote(`KOT ${data.ticket.kotNumber} created`);
      onKotSuccess?.();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const kotAction = async (
    ticketId: string,
    action: 'mark_fired' | 'mark_served' | 'close_kot' | 'settle_kot',
  ) => {
    try {
      const payload: Record<string, unknown> = { action, ticketId, paymentMethod: payMethod };
      if (action === 'settle_kot') {
        if (splitSeats > 1) payload.splitCount = splitSeats;
        if (payMethod === 'SPLIT' && splitSeats <= 1) {
          payload.payments = [
            { method: 'CASH', amount: Number(cashAmt) || 0 },
            { method: 'CARD', amount: Number(cardAmt) || 0 },
          ];
        }
      }
      const res = await fetch('/api/restaurant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (action === 'settle_kot') {
        const splitNote =
          data.splitCount > 1 ? ` · ${data.splitCount} bills` : '';
        setNote(`Settled ${data.orderNumber || 'order'} · LKR ${Number(data.grandTotal || 0).toFixed(2)}${splitNote}`);
      } else {
        setNote(`KOT ${action.replace(/_/g, ' ')}`);
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const tableName = (tableId: string | null) =>
    tableId ? tables.find((t) => t.id === tableId)?.name || 'Takeaway' : 'Takeaway';

  const cartCount = cartLines?.reduce((n, l) => n + l.qty, 0) ?? 0;

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6'}>
      {!embedded && (
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-emerald-400" /> Restaurant floor & KOT
          </h1>
          <p className="text-xs text-muted-foreground">Tables + live kitchen ticket board via /api/restaurant</p>
        </div>
      )}
      {embedded && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-zinc-400">
            Select a table, then fire KOT from the bag{cartCount > 0 ? ` (${cartCount} items)` : ''}.
          </p>
          <Link href="/restaurant" className="text-[10px] font-bold text-amber-400 hover:underline">
            Full floor →
          </Link>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
      {note && (
        <p role="status" className="text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" /> {note}
        </p>
      )}

      <div className={`grid gap-4 ${embedded ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        <div className={embedded ? 'space-y-3' : 'lg:col-span-2 space-y-4'}>
          <div className={`grid gap-2 ${embedded ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
            {tables.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t)}
                className={`p-3 rounded-2xl text-left glass-card transition-all ${
                  selected?.id === t.id ? 'glow-border-emerald' : ''
                }`}
              >
                <p className="text-sm font-bold">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {t.capacity} seats · {t.status}
                </p>
                {t.activeOrder && (
                  <p className="text-[10px] text-emerald-400 mt-1 font-mono">{t.activeOrder.kotNumber}</p>
                )}
              </button>
            ))}
          </div>

          {selected && (
            <div className="p-4 rounded-2xl glass-card space-y-3">
              <h2 className="text-sm font-bold">{selected.name}</h2>
              <div className="flex flex-wrap gap-2">
                {(['VACANT', 'SEATED', 'ORDERED', 'SERVED'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void setStatus(selected.id, s)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${
                      selected.status === s ? 'border-emerald-400 text-emerald-400' : 'border-zinc-800'
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void createKot()}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-500 text-zinc-950 disabled:opacity-50"
                >
                  {cartCount > 0 ? 'Fire KOT from bag' : 'Fire demo KOT'}
                </button>
              </div>
              {selected.activeOrder && (
                <div className="text-xs space-y-1">
                  <p className="font-mono text-emerald-400">{selected.activeOrder.kotNumber}</p>
                  {selected.activeOrder.items?.map((i, idx) => (
                    <p key={idx} className="text-muted-foreground">
                      {i.qty}× {i.name} — {i.price}
                    </p>
                  ))}
                  <p className="font-bold">Total LKR {Number(selected.activeOrder.total).toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl glass-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-amber-400" /> KOT board
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <label className="flex items-center gap-1">
                Pay
                <select
                  aria-label="Settle payment method"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as 'CASH' | 'CARD' | 'SPLIT')}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1"
                >
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD</option>
                  <option value="SPLIT">SPLIT</option>
                </select>
              </label>
              <label className="flex items-center gap-1">
                Seats
                <select
                  aria-label="Bill split seat count"
                  value={splitSeats}
                  onChange={(e) => setSplitSeats(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n === 1 ? '1 bill' : `${n}-way`}
                    </option>
                  ))}
                </select>
              </label>
              {payMethod === 'SPLIT' && splitSeats <= 1 && (
                <>
                  <input
                    aria-label="Cash amount"
                    placeholder="Cash"
                    value={cashAmt}
                    onChange={(e) => setCashAmt(e.target.value)}
                    className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 font-mono"
                  />
                  <input
                    aria-label="Card amount"
                    placeholder="Card"
                    value={cardAmt}
                    onChange={(e) => setCardAmt(e.target.value)}
                    className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 font-mono"
                  />
                </>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">{tickets.length} open ticket(s)</p>
          <div className={`space-y-2 overflow-y-auto ${embedded ? 'max-h-[280px]' : 'max-h-[420px]'}`}>
            {tickets.map((t) => (
              <div key={t.id} className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-emerald-400 text-xs">{t.kotNumber}</span>
                  <span className="text-[10px] text-zinc-500">{t.status}</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  {tableName(t.tableId)} · {t.waiterName || '—'}
                </p>
                {t.itemsJson?.map((i, idx) => (
                  <p key={idx} className="text-[10px]">
                    {i.qty}× {i.name}
                  </p>
                ))}
                <p className="text-xs font-bold">LKR {Number(t.totalAmount).toFixed(2)}</p>
                <div className="flex flex-wrap gap-1">
                  {t.status === 'OPEN' && (
                    <button
                      type="button"
                      onClick={() => void kotAction(t.id, 'mark_fired')}
                      className="px-2 py-1 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold"
                    >
                      Fire
                    </button>
                  )}
                  {(t.status === 'OPEN' || t.status === 'FIRED') && (
                    <button
                      type="button"
                      onClick={() => void kotAction(t.id, 'mark_served')}
                      className="px-2 py-1 rounded text-[10px] bg-blue-500/20 text-blue-300 font-bold"
                    >
                      Served
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void kotAction(t.id, 'settle_kot')}
                    className="px-2 py-1 rounded text-[10px] bg-emerald-500 text-zinc-950 font-bold"
                  >
                    Settle & pay
                  </button>
                  <button
                    type="button"
                    onClick={() => void kotAction(t.id, 'close_kot')}
                    className="px-2 py-1 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-6">No open kitchen tickets.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
