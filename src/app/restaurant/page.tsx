'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { UtensilsCrossed, AlertCircle, CheckCircle2, ChefHat } from 'lucide-react';

type KotTicket = {
  id: string;
  kotNumber: string;
  tableId: string | null;
  waiterName: string | null;
  itemsJson: Array<{ name: string; qty: number; price: number; notes?: string }>;
  totalAmount: string;
  status: string;
  createdAt: string;
};

type TableRow = {
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

export default function RestaurantFloorPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [tickets, setTickets] = useState<KotTicket[]>([]);
  const [selected, setSelected] = useState<TableRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/restaurant');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Load failed');
    setTables(data.tables || []);
    setTickets(data.tickets || []);
    if (selected) {
      const next = (data.tables || []).find((t: TableRow) => t.id === selected.id);
      setSelected(next || data.tables?.[0] || null);
    } else if (data.tables?.[0]) {
      setSelected(data.tables[0]);
    }
  }, [selected]);

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
  }, []);

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
    try {
      const res = await fetch('/api/restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_kot',
          tableId: selected.id,
          waiterName: 'Floor',
          items: [{ name: 'House Special', qty: 1, price: 1500, notes: 'Demo KOT' }],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setNote(`KOT ${data.ticket.kotNumber} fired`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const kotAction = async (ticketId: string, action: 'mark_fired' | 'mark_served' | 'close_kot') => {
    try {
      const res = await fetch('/api/restaurant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ticketId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setNote(`KOT ${action.replace(/_/g, ' ')}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const tableName = (tableId: string | null) =>
    tableId ? tables.find((t) => t.id === tableId)?.name || 'Takeaway' : 'Takeaway';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-emerald-400" /> Restaurant floor & KOT
        </h1>
        <p className="text-xs text-muted-foreground">Tables + live kitchen ticket board via /api/restaurant</p>
      </div>
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

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {tables.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t)}
                className={`p-4 rounded-2xl text-left glass-card transition-all ${
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
            <div className="p-5 rounded-2xl glass-card space-y-3">
              <h2 className="text-sm font-bold">{selected.name}</h2>
              <div className="flex flex-wrap gap-2">
                {(['VACANT', 'SEATED', 'ORDERED', 'SERVED'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(selected.id, s)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${
                      selected.status === s ? 'border-emerald-400 text-emerald-400' : 'border-zinc-800'
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={createKot}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-500 text-zinc-950"
                >
                  Fire demo KOT
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

        <div className="p-5 rounded-2xl glass-card space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-amber-400" /> KOT board
          </h2>
          <p className="text-[10px] text-muted-foreground">{tickets.length} open ticket(s)</p>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {tickets.map((t) => (
              <div key={t.id} className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-emerald-400 text-xs">{t.kotNumber}</span>
                  <span className="text-[10px] text-zinc-500">{t.status}</span>
                </div>
                <p className="text-[10px] text-zinc-400">{tableName(t.tableId)} · {t.waiterName || '—'}</p>
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
                      onClick={() => kotAction(t.id, 'mark_fired')}
                      className="px-2 py-1 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold"
                    >
                      Fire
                    </button>
                  )}
                  {(t.status === 'OPEN' || t.status === 'FIRED') && (
                    <button
                      type="button"
                      onClick={() => kotAction(t.id, 'mark_served')}
                      className="px-2 py-1 rounded text-[10px] bg-blue-500/20 text-blue-300 font-bold"
                    >
                      Served
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => kotAction(t.id, 'close_kot')}
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
