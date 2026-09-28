'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  ClipboardCheck,
  Package,
  RefreshCw,
  Save,
  TrendingUp,
} from 'lucide-react';

type DemandSummary = {
  generatedAt: string;
  lookbackDays: number;
  leadTimeDays: number;
  monitoredSkus: number;
  recommendedSkus: number;
  highRiskSkus: number;
  projectedOrderUnits: number;
  sourceOrders: number;
};

type DemandItem = {
  productId: string;
  sku: string;
  name: string;
  demandQty: number;
  revenue: number;
  avgDailyDemand: number;
  onHand: number;
  reserved: number;
  available: number;
  safetyStock: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  stockoutRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  classification: string;
  reason: string;
};

type DemandResponse = {
  success: boolean;
  summary?: DemandSummary;
  items?: DemandItem[];
  allItems?: DemandItem[];
  error?: string;
  setupRequired?: boolean;
  setupMessage?: string;
};

const riskTone = {
  HIGH: 'border-red-500/40 bg-red-500/10 text-red-200',
  MEDIUM: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  LOW: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
};

export default function AiDemandPage() {
  const [lookbackDays, setLookbackDays] = useState(30);
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [data, setData] = useState<DemandResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const params = useMemo(
    () => `lookbackDays=${lookbackDays}&leadTimeDays=${leadTimeDays}`,
    [lookbackDays, leadTimeDays],
  );

  const loadPlan = async () => {
    setLoading(true);
    setNotice('');
    try {
      const response = await fetch(`/api/inventory/demand?${params}`, { cache: 'no-store' });
      const json = (await response.json()) as DemandResponse;
      setData(json);
    } catch {
      setData({ success: false, error: 'Could not load demand planning data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [params]);

  const saveSnapshot = async () => {
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch('/api/inventory/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookbackDays, leadTimeDays }),
      });
      const json = (await response.json()) as DemandResponse & { forecastRunId?: string };
      if (!response.ok || !json.success) {
        setNotice(json.setupMessage || json.error || 'Could not save forecast snapshot');
        return;
      }
      setNotice(`Forecast snapshot saved: ${json.forecastRunId}`);
      await loadPlan();
    } catch {
      setNotice('Could not save forecast snapshot');
    } finally {
      setSaving(false);
    }
  };

  const summary = data?.summary;
  const items = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/company/admin" className="mb-2 flex items-center gap-1 text-xs text-zinc-400 transition hover:text-emerald-300">
            <ArrowLeft className="h-3.5 w-3.5" /> Company Admin
          </Link>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Inventory intelligence</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black tracking-tight text-white">
            <TrendingUp className="h-6 w-6 text-emerald-300" />
            Demand Planning
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Read-only forecast recommendations from live sales and stock. Saving a snapshot creates forecast evidence and draft
            replenishment recommendations only; it does not create purchase orders or change stock.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-bold text-zinc-300">
            Lookback
            <select
              value={lookbackDays}
              onChange={(event) => setLookbackDays(Number(event.target.value))}
              className="h-11 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-emerald-400"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-zinc-300">
            Lead time
            <select
              value={leadTimeDays}
              onChange={(event) => setLeadTimeDays(Number(event.target.value))}
              className="h-11 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-emerald-400"
            >
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
          <button
            type="button"
            onClick={loadPlan}
            disabled={loading}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-800 px-4 text-sm font-black text-zinc-100 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={saveSnapshot}
            disabled={saving || loading}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-black text-black transition hover:bg-emerald-400 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving' : 'Save Snapshot'}
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-bold text-amber-100">
          {notice}
        </div>
      )}

      {data && !data.success && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {data.setupMessage || data.error || 'Demand planning is unavailable'}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'SKUs monitored', value: summary?.monitoredSkus ?? 0, icon: Package, tone: 'text-emerald-300' },
          { label: 'Recommendations', value: summary?.recommendedSkus ?? 0, icon: ClipboardCheck, tone: 'text-cyan-300' },
          { label: 'High risk SKUs', value: summary?.highRiskSkus ?? 0, icon: AlertTriangle, tone: 'text-amber-300' },
          { label: 'Projected units', value: summary?.projectedOrderUnits ?? 0, icon: BarChart3, tone: 'text-purple-300' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
            <Icon className={`mb-3 h-5 w-5 ${tone}`} />
            <div className="text-2xl font-black tabular-nums text-white">{loading ? '...' : value}</div>
            <div className="text-xs text-zinc-400">{label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-950/70">
        <div className="flex flex-col gap-2 border-b border-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-black text-white">Replenishment Radar</h2>
            <p className="text-xs text-zinc-400">
              {summary ? `${summary.sourceOrders} orders analyzed. Generated ${new Date(summary.generatedAt).toLocaleString()}.` : 'Loading sales velocity.'}
            </p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-200">
            No auto PO
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-400">
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3 text-right">Available</th>
                <th className="px-4 py-3 text-right">Avg/day</th>
                <th className="px-4 py-3 text-right">ROP</th>
                <th className="px-4 py-3 text-right">Suggested</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.productId} className="border-b border-zinc-900 text-zinc-200 last:border-0">
                  <td className="px-4 py-4">
                    <div className="font-black text-white">{item.name}</div>
                    <div className="text-xs text-zinc-500">{item.sku}</div>
                    <div className="mt-1 max-w-xl text-xs text-zinc-400">{item.reason}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${riskTone[item.stockoutRisk]}`}>
                      {item.stockoutRisk}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-bold text-zinc-300">{item.classification}</td>
                  <td className="px-4 py-4 text-right tabular-nums">{item.available}</td>
                  <td className="px-4 py-4 text-right tabular-nums">{item.avgDailyDemand.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right tabular-nums">{item.reorderPoint}</td>
                  <td className="px-4 py-4 text-right font-black tabular-nums text-emerald-300">{item.suggestedOrderQty}</td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-400">
                    No replenishment recommendations for the selected window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
