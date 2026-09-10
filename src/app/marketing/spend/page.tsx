'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, Plus } from 'lucide-react';

type SpendRow = {
  id: string;
  channel: string;
  campaignId: string | null;
  campaignName: string | null;
  amount: string | number;
  spentOn: string;
};

type RoasRow = {
  campaignId: string;
  channel: string;
  campaignName: string | null;
  spendLkr: number;
  revenueLkr: number;
  orderCount: number;
  roas: number | null;
  kind: string;
};

export default function MarketingSpendPage() {
  const [rows, setRows] = useState<SpendRow[]>([]);
  const [summary, setSummary] = useState<{ total: number; byChannel: Record<string, number> } | null>(null);
  const [roas, setRoas] = useState<{
    rows: RoasRow[];
    summary: { totalSpend: number; totalRevenue: number; blendedRoas: number | null };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    channel: 'META',
    campaignId: '',
    campaignName: '',
    amount: 5000,
  });

  const load = useCallback(async () => {
    const res = await fetch('/api/marketing/spend');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    setRows(data.spend || []);
    setSummary(data.summary || null);
    const r = await fetch('/api/marketing/roas');
    const rd = await r.json();
    if (rd.success) setRoas({ rows: rd.rows || [], summary: rd.summary });
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/marketing/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: form.channel,
          campaignId: form.campaignId || undefined,
          campaignName: form.campaignName || undefined,
          amount: form.amount,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setForm((f) => ({ ...f, campaignId: '', campaignName: '', amount: 5000 }));
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-emerald-400" /> Marketing spend
        </h1>
        <p className="text-xs text-muted-foreground">
          VERT-M01 spend ledger · VERT-M03/M04 ROAS by campaignId (use <code className="font-mono">creative:&lt;projectId&gt;</code> or{' '}
          <code className="font-mono">blast_*</code>; pass same id on checkout).
        </p>
      </div>

      {summary && (
        <p className="text-sm font-mono text-emerald-400">
          Total spend LKR {Number(summary.total).toFixed(2)}
          {Object.keys(summary.byChannel || {}).length > 0 &&
            ` · ${Object.entries(summary.byChannel)
              .map(([k, v]) => `${k} ${Number(v).toFixed(0)}`)
              .join(' · ')}`}
        </p>
      )}

      {roas?.summary && (
        <p className="text-sm font-mono text-sky-400">
          Attributed revenue LKR {Number(roas.summary.totalRevenue).toFixed(2)}
          {roas.summary.blendedRoas != null ? ` · blended ROAS ${roas.summary.blendedRoas}x` : ''}
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-amber-400">
          {error}
        </p>
      )}

      <form onSubmit={create} className="p-5 rounded-2xl glass-card grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="sp-ch" className="text-xs font-semibold block mb-1">Channel</label>
          <select
            id="sp-ch"
            value={form.channel}
            onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm"
          >
            <option value="META">META</option>
            <option value="GOOGLE">GOOGLE</option>
            <option value="WHATSAPP">WHATSAPP</option>
            <option value="CREATIVE">CREATIVE</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
        <div>
          <label htmlFor="sp-amt" className="text-xs font-semibold block mb-1">Amount (LKR)</label>
          <input
            id="sp-amt"
            type="number"
            min={1}
            required
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono"
          />
        </div>
        <div>
          <label htmlFor="sp-cid" className="text-xs font-semibold block mb-1">Campaign ID</label>
          <input
            id="sp-cid"
            value={form.campaignId}
            onChange={(e) => setForm((f) => ({ ...f, campaignId: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono"
            placeholder="meta-spring-01"
          />
        </div>
        <div>
          <label htmlFor="sp-name" className="text-xs font-semibold block mb-1">Campaign name</label>
          <input
            id="sp-name"
            value={form.campaignName}
            onChange={(e) => setForm((f) => ({ ...f, campaignName: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="sm:col-span-2 min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Log spend
        </button>
      </form>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">When</th>
              <th className="pb-2">Channel</th>
              <th className="pb-2">Campaign</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 text-muted-foreground">{new Date(r.spentOn).toLocaleDateString()}</td>
                <td className="py-2 font-semibold">{r.channel}</td>
                <td className="py-2 font-mono text-[10px]">{r.campaignId || r.campaignName || '—'}</td>
                <td className="py-2 text-right font-mono">{Number(r.amount).toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  No spend logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {roas && roas.rows.length > 0 && (
        <div className="p-5 rounded-2xl glass-card overflow-x-auto">
          <h2 className="text-sm font-bold mb-3">Campaign ROAS</h2>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-muted-foreground">
                <th className="pb-2">Kind</th>
                <th className="pb-2">Campaign</th>
                <th className="pb-2 text-right">Spend</th>
                <th className="pb-2 text-right">Revenue</th>
                <th className="pb-2 text-right">Orders</th>
                <th className="pb-2 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {roas.rows.map((r) => (
                <tr key={r.campaignId}>
                  <td className="py-2">{r.kind}</td>
                  <td className="py-2 font-mono text-[10px]">{r.campaignName || r.campaignId}</td>
                  <td className="py-2 text-right font-mono">{r.spendLkr.toFixed(0)}</td>
                  <td className="py-2 text-right font-mono">{r.revenueLkr.toFixed(0)}</td>
                  <td className="py-2 text-right">{r.orderCount}</td>
                  <td className="py-2 text-right font-bold text-emerald-400">
                    {r.roas != null ? `${r.roas}x` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
