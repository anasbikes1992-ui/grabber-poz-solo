'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

type Metrics = {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  avgOrderValue: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  salesBySource: Array<{ source: string; count: number; revenue: number }>;
};

function BarChart({ rows, labelKey, valueKey }: { rows: Array<Record<string, unknown>>; labelKey: string; valueKey: string }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey] || 0)));
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const value = Number(row[valueKey] || 0);
        const pct = Math.round((value / max) * 100);
        return (
          <div key={String(row[labelKey])} className="space-y-1">
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>{String(row[labelKey])}</span>
              <span>LKR {value.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
              <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [kpiNote, setKpiNote] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reports/sales')
      .then((r) => r.json())
      .then((d) => d.success && setMetrics(d.metrics))
      .catch(() => {});
    fetch('/api/kpi?ids=today_revenue,month_revenue,sales_by_channel')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setKpiNote(`KPI API · today LKR ${Number(d.kpis.today_revenue || 0).toLocaleString()}`);
      })
      .catch(() => {});
  }, []);

  const m = metrics || {
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    avgOrderValue: 0,
    topProducts: [],
    salesBySource: [],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Merchant Hub
          </Link>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" /> Reports & Analytics
          </h1>
          {kpiNote && <p className="text-[10px] text-zinc-500 mt-1">{kpiNote} · /api/kpi</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href="/api/kpi"
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold"
          >
            KPI JSON
          </Link>
          <Link
            href="/api/reports?type=sales-by-channel"
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export JSON
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Today', value: m.todayRevenue, icon: DollarSign },
          { label: 'This Week', value: m.weekRevenue, icon: TrendingUp },
          { label: 'This Month', value: m.monthRevenue, icon: BarChart3 },
          { label: 'Avg Order', value: m.avgOrderValue, icon: DollarSign },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="p-5 rounded-2xl glass-card border border-zinc-800">
              <div className="flex justify-between items-center text-xs text-zinc-400 mb-2">
                <span>{card.label}</span>
                <Icon className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white tabular-nums">LKR {Math.round(card.value).toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-zinc-800 space-y-3">
          <h2 className="font-bold text-white text-sm">Sales by Channel</h2>
          {m.salesBySource.length === 0 ? (
            <p className="text-xs text-zinc-500">No channel data yet.</p>
          ) : (
            <BarChart rows={m.salesBySource.map((s) => ({ channel: s.source, revenue: s.revenue }))} labelKey="channel" valueKey="revenue" />
          )}
        </div>

        <div className="p-5 rounded-2xl glass-card border border-zinc-800 space-y-3">
          <h2 className="font-bold text-white text-sm">Top Products (Month)</h2>
          {m.topProducts.length === 0 ? (
            <p className="text-xs text-zinc-500">No product sales yet.</p>
          ) : (
            <BarChart rows={m.topProducts.map((p) => ({ name: p.name, revenue: p.revenue }))} labelKey="name" valueKey="revenue" />
          )}
        </div>
      </div>
    </div>
  );
}
