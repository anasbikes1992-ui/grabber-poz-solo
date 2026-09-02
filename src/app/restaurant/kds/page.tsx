'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChefHat, RefreshCw } from 'lucide-react';

type Kot = {
  id: string;
  kotNumber: string;
  status: string;
  itemsJson: Array<{ name: string; qty: number; notes?: string }>;
  createdAt: string;
};

export default function KdsPage() {
  const [tickets, setTickets] = useState<Kot[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/restaurant');
      const data = await res.json();
      const open = (data.tickets || []).filter((t: Kot) => t.status !== 'CLOSED' && t.status !== 'VOID');
      setTickets(open);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [load]);

  async function updateStatus(kotNumber: string, action: string) {
    await fetch('/api/restaurant', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, kotNumber }),
    });
    void load();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <ChefHat className="text-emerald-400" /> Kitchen Display
        </h1>
        <button type="button" onClick={() => void load()} className="px-3 py-2 rounded-lg bg-zinc-800 text-sm flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tickets.map((t) => (
          <div key={t.id} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-lg font-bold">{t.kotNumber}</p>
                <p className="text-xs text-zinc-400">{new Date(t.createdAt).toLocaleTimeString()}</p>
              </div>
              <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">{t.status}</span>
            </div>
            <ul className="space-y-1 text-sm mb-4">
              {(t.itemsJson || []).map((item, i) => (
                <li key={i}>
                  {item.qty}× {item.name} {item.notes ? `(${item.notes})` : ''}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              {t.status === 'OPEN' && (
                <button type="button" onClick={() => void updateStatus(t.kotNumber, 'mark_fired')} className="flex-1 py-2 rounded-lg bg-amber-500 text-black font-bold text-xs">
                  Fire
                </button>
              )}
              {t.status === 'FIRED' && (
                <button type="button" onClick={() => void updateStatus(t.kotNumber, 'mark_served')} className="flex-1 py-2 rounded-lg bg-emerald-500 text-black font-bold text-xs">
                  Served
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
