'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft, TrendingUp, Package, AlertTriangle } from 'lucide-react';

export default function AiDemandPage() {
  const [stats, setStats] = useState<{ totalSkus: number; lowStockCount: number; topProducts: Array<{ name: string }> } | null>(
    null,
  );

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.stats) {
          setStats({
            totalSkus: d.stats.totalSkus,
            lowStockCount: d.stats.lowStockCount,
            topProducts: d.stats.topProducts || [],
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Merchant Hub
        </Link>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-400" /> Jarvis AI Demand Predictor
        </h1>
        <p className="text-xs text-zinc-400 mt-1">Velocity-based stockout forecasts & reorder hints</p>
      </div>

      <div className="p-6 rounded-2xl glass-card border border-purple-500/20 bg-gradient-to-br from-purple-950/40 to-zinc-950">
        <p className="text-sm text-zinc-300 leading-relaxed">
          Jarvis analyzes live SKU velocity and low-stock radar from your solo database. Open the Jarvis drawer from the
          header for conversational demand planning, or review signals below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-zinc-800">
          <Package className="w-5 h-5 text-emerald-400 mb-2" />
          <div className="text-2xl font-black text-white tabular-nums">{stats?.totalSkus ?? '—'}</div>
          <div className="text-xs text-zinc-400">SKUs monitored</div>
        </div>
        <div className="p-5 rounded-2xl glass-card border border-zinc-800">
          <AlertTriangle className="w-5 h-5 text-amber-400 mb-2" />
          <div className="text-2xl font-black text-amber-400 tabular-nums">{stats?.lowStockCount ?? '—'}</div>
          <div className="text-xs text-zinc-400">Reorder alerts</div>
        </div>
        <div className="p-5 rounded-2xl glass-card border border-zinc-800">
          <TrendingUp className="w-5 h-5 text-purple-400 mb-2" />
          <div className="text-2xl font-black text-white tabular-nums">{stats?.topProducts?.length ?? 0}</div>
          <div className="text-xs text-zinc-400">Hero movers today</div>
        </div>
      </div>

      {stats?.topProducts && stats.topProducts.length > 0 && (
        <div className="p-5 rounded-2xl glass-card border border-zinc-800 space-y-2">
          <h2 className="font-bold text-white text-sm">Suggested focus SKUs</h2>
          {stats.topProducts.map((p) => (
            <div key={p.name} className="text-xs text-zinc-300">
              · {p.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
