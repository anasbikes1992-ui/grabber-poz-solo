'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Search, Trash2, ArrowLeft, Package } from 'lucide-react';

type Quote = {
  id: string;
  quoteNo: string;
  clientName: string;
  grandTotal: number;
  status: string;
  validUntil: string;
};

export default function WholesalePage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [lines, setLines] = useState([{ name: '', qty: 1, price: 0 }]);

  const load = () =>
    fetch('/api/quotations')
      .then((r) => r.json())
      .then((d) => setQuotes(d.quotes || []));

  useEffect(() => {
    void load();
  }, []);

  const filtered = quotes.filter(
    (q) =>
      q.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      q.quoteNo?.toLowerCase().includes(search.toLowerCase()),
  );

  async function createQuote(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName, lines, channel: 'WHOLESALE' }),
    });
    setOpen(false);
    setClientName('');
    setLines([{ name: '', qty: 1, price: 0 }]);
    void load();
  }

  async function remove(id: string) {
    await fetch(`/api/quotations?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Merchant Hub
          </Link>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-400" /> Wholesale & B2B
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Volume quotes via /api/quotations — convert to orders from POS.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-11 px-4 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New wholesale quote
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client or quote no…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
        />
      </div>

      <div className="grid gap-3">
        {filtered.map((q) => (
          <div key={q.id} className="p-4 rounded-2xl glass-card border border-zinc-800 flex justify-between gap-3">
            <div>
              <div className="font-mono text-purple-300 text-sm">{q.quoteNo}</div>
              <div className="font-bold text-white mt-1">{q.clientName}</div>
              <div className="text-xs text-zinc-400">
                LKR {Number(q.grandTotal).toLocaleString()} · {q.status} · Valid {q.validUntil}
              </div>
            </div>
            <button type="button" onClick={() => void remove(q.id)} className="text-red-400 text-xs font-bold flex items-center gap-1 self-start">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-500 p-8 text-center glass-card rounded-2xl border border-zinc-800">
            No wholesale quotes yet. Create one for bulk buyers.
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={createQuote} className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" /> Wholesale quote
            </h2>
            <input
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client / distributor name"
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm"
            />
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input
                  required
                  value={line.name}
                  onChange={(e) =>
                    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, name: e.target.value } : l)))
                  }
                  placeholder="Product"
                  className="col-span-1 px-2 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs"
                />
                <input
                  type="number"
                  min={1}
                  value={line.qty}
                  onChange={(e) =>
                    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, qty: Number(e.target.value) } : l)))
                  }
                  className="px-2 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono"
                />
                <input
                  type="number"
                  min={0}
                  value={line.price}
                  onChange={(e) =>
                    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, price: Number(e.target.value) } : l)))
                  }
                  className="px-2 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono"
                />
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-400">
                Cancel
              </button>
              <button type="submit" className="flex-1 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold">
                Save quote
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
