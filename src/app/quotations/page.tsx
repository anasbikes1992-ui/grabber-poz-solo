'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  ArrowLeft,
  ArrowRightCircle,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  Sparkles,
} from 'lucide-react';

type Quote = {
  id: string;
  quoteNo: string;
  clientName: string;
  grandTotal: number;
  status: string;
  validUntil: string;
  convertedOrderNumber?: string;
};

const STATUS_ACTIONS = ['ISSUED', 'ACCEPTED', 'REJECTED'] as const;

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [lines, setLines] = useState([{ name: '', qty: 1, price: 0 }]);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function setStatus(id: string, status: string) {
    setBusyId(id);
    try {
      await fetch('/api/quotations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'update_status', status }),
      });
      void load();
    } finally {
      setBusyId(null);
    }
  }

  async function convertToOrder(id: string) {
    setBusyId(id);
    try {
      const res = await fetch('/api/quotations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'convert_to_order' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      void load();
    } finally {
      setBusyId(null);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'ISSUED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'REJECTED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'CONVERTED':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <Link
            href="/app"
            className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1.5 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Merchant Hub
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <span>B2B Quotations & Estimates</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Create proforma invoices, manage approval status, and convert to active sales orders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center gap-2 cursor-pointer hover:bg-emerald-400 transition-all shadow-glow-em shrink-0"
        >
          <Plus className="w-4 h-4" /> New Quotation
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by quote number or client name…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="grid gap-3.5">
        {filtered.map((q) => (
          <div
            key={q.id}
            className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 hover:border-zinc-700 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-bold text-white">{q.quoteNo}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getStatusBadge(
                    q.status,
                  )}`}
                >
                  {q.status}
                </span>
                {q.convertedOrderNumber && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-500/30">
                    Order {q.convertedOrderNumber}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-zinc-200">{q.clientName || 'General Client'}</p>
              <div className="flex items-center gap-3 pt-1 text-[11px]">
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  LKR {Number(q.grandTotal || 0).toLocaleString()}
                </span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3 text-zinc-500" /> Valid until {q.validUntil}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
              {q.status !== 'CONVERTED' &&
                STATUS_ACTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busyId === q.id || q.status === s}
                    onClick={() => void setStatus(q.id, s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      q.status === s
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {s === 'ISSUED' ? 'Issue' : s === 'ACCEPTED' ? 'Accept' : 'Reject'}
                  </button>
                ))}

              {q.status === 'ACCEPTED' && (
                <button
                  type="button"
                  disabled={busyId === q.id}
                  onClick={() => void convertToOrder(q.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-500 text-zinc-950 hover:bg-purple-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-glow-purple"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  <span>Convert to Order</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => fetch(`/api/quotations?id=${q.id}`, { method: 'DELETE' }).then(() => load())}
                className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ml-1"
                aria-label={`Delete ${q.quoteNo}`}
                title="Delete Quotation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-12 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
            <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">No quotations found</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Create your first B2B proforma quote with item lines, custom pricing, and validity period.
            </p>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <form
            onSubmit={createQuote}
            className="w-full max-w-lg p-6 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Create New Quotation</span>
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">Client Name / Business</label>
              <input
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Apex Hospitality Ltd"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">Quotation Items</label>
              {lines.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    required
                    placeholder="Product / Service description"
                    value={l.name}
                    onChange={(e) => {
                      const next = [...lines];
                      next[i].name = e.target.value;
                      setLines(next);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={l.qty}
                    onChange={(e) => {
                      const next = [...lines];
                      next[i].qty = Number(e.target.value);
                      setLines(next);
                    }}
                    className="w-16 px-2 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs text-center focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Unit Price"
                    value={l.price || ''}
                    onChange={(e) => {
                      const next = [...lines];
                      next[i].price = Number(e.target.value);
                      setLines(next);
                    }}
                    className="w-24 px-2 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs text-right focus:outline-none focus:border-purple-500"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLines([...lines, { name: '', qty: 1, price: 0 }])}
                className="text-xs text-purple-400 font-semibold hover:underline pt-1"
              >
                + Add item line
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 transition-all shadow-glow-em"
              >
                Create Quotation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
