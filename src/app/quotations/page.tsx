'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Search, Trash2, ArrowLeft } from 'lucide-react';

type Quote = {
  id: string;
  quoteNo: string;
  clientName: string;
  grandTotal: number;
  status: string;
  validUntil: string;
};

export default function QuotationsPage() {
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
      body: JSON.stringify({ clientName, lines }),
    });
    setOpen(false);
    setClientName('');
    setLines([{ name: '', qty: 1, price: 0 }]);
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Merchant Hub
          </Link>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-400" /> B2B Quotations
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center gap-2 cursor-pointer btn-press"
        >
          <Plus className="w-4 h-4" /> New Quotation
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quotes…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
        />
      </div>

      <div className="grid gap-3">
        {filtered.map((q) => (
          <div key={q.id} className="p-4 rounded-2xl glass-card border border-zinc-800 flex justify-between gap-4">
            <div>
              <div className="font-bold text-white">{q.quoteNo}</div>
              <div className="text-xs text-zinc-400">{q.clientName}</div>
              <div className="text-xs text-emerald-400 mt-1">LKR {Number(q.grandTotal || 0).toLocaleString()}</div>
            </div>
            <button
              type="button"
              onClick={() => fetch(`/api/quotations?id=${q.id}`, { method: 'DELETE' }).then(() => load())}
              className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
              aria-label={`Delete ${q.quoteNo}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-500 p-8 text-center glass-card rounded-2xl border border-zinc-800">
            No quotations yet. Create your first B2B proforma quote.
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <form onSubmit={createQuote} className="w-full max-w-lg p-6 rounded-2xl glass-card border border-zinc-700 space-y-4">
            <h2 className="font-bold text-white">New Quotation</h2>
            <input
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
            />
            <input
              value={lines[0]?.name || ''}
              onChange={(e) => setLines([{ ...lines[0], name: e.target.value }])}
              placeholder="Line item description"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-zinc-400 text-sm cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-sm cursor-pointer">
                Issue Quote
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
