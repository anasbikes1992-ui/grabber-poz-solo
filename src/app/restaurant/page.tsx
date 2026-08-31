'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { UtensilsCrossed, AlertCircle, CheckCircle2 } from 'lucide-react';

type TableRow = {
  id: string;
  name: string;
  capacity: number;
  status: string;
  activeOrder?: { kotNumber: string; items: Array<{ name: string; qty: number; price: number }>; total: number; waiter: string };
};

export default function RestaurantFloorPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [selected, setSelected] = useState<TableRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/restaurant');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Load failed');
    setTables(data.tables || []);
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
        const res = await fetch('/api/restaurant');
        const data = await res.json();
        if (data.success) {
          setTables(data.tables || []);
          setSelected(data.tables?.[0] || null);
        }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-emerald-400" /> Restaurant floor & KOT
        </h1>
        <p className="text-xs text-muted-foreground">Durable tables via /api/restaurant</p>
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
            <p className="text-[10px] text-muted-foreground">{t.capacity} seats · {t.status}</p>
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
            <button type="button" onClick={createKot} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-500 text-zinc-950">
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
  );
}
