'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ArrowLeft, Download, RefreshCw } from 'lucide-react';

type TrialRow = {
  code: string;
  name: string;
  type: string;
  debit: string | number;
  credit: string | number;
};

export default function AccountsPage() {
  const [rows, setRows] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reports?type=trial-balance');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const list = (data.rows || []) as TrialRow[];
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const totalDebit = rows.reduce((s, r) => s + Number(r.debit || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + Number(r.credit || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Merchant Hub
          </Link>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-sky-400" /> Chart of Accounts
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Trial balance from posted journal lines — /api/reports?type=trial-balance</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-2 rounded-xl border border-zinc-800 text-xs font-bold flex items-center gap-2 text-zinc-300"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link
            href="/api/reports?type=trial-balance"
            className="px-3 py-2 rounded-xl border border-zinc-800 text-xs font-bold flex items-center gap-2 text-zinc-300"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </Link>
        </div>
      </div>

      {error && <p className="text-xs text-amber-400">{error}</p>}

      <div className="grid grid-cols-2 gap-3 text-xs max-w-md">
        <div className="p-4 rounded-2xl glass-card border border-zinc-800">
          <p className="text-zinc-400">Total debit</p>
          <p className="text-xl font-bold text-white tabular-nums">LKR {totalDebit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 rounded-2xl glass-card border border-zinc-800">
          <p className="text-zinc-400">Total credit</p>
          <p className="text-xl font-bold text-white tabular-nums">LKR {totalCredit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="p-5 rounded-2xl glass-card border border-zinc-800 overflow-x-auto">
        {loading && <p className="text-xs text-zinc-500">Loading trial balance…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">No GL postings yet. Complete a POS sale to seed journal entries.</p>
        )}
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="pb-2 font-medium">Code</th>
              <th className="pb-2 font-medium">Account</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium text-right">Debit</th>
              <th className="pb-2 font-medium text-right">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.code}>
                <td className="py-2 font-mono text-emerald-400">{r.code}</td>
                <td className="py-2 text-white">{r.name}</td>
                <td className="py-2 text-zinc-400">{r.type}</td>
                <td className="py-2 text-right font-mono tabular-nums">{Number(r.debit || 0).toFixed(2)}</td>
                <td className="py-2 text-right font-mono tabular-nums">{Number(r.credit || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-zinc-500">
        VAT worksheet: <Link href="/api/reports?type=vat-worksheet" className="text-emerald-400 underline">/api/reports?type=vat-worksheet</Link>
        {' · '}
        Period close: <Link href="/api/reports?type=period-close-check" className="text-emerald-400 underline">check blockers</Link>
      </p>
    </div>
  );
}
