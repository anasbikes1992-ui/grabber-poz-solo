'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Activity,
  TrendingUp,
  Package,
  Boxes,
  BellRing,
  DollarSign,
  RotateCcw,
  Search,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import {
  ALL_MERCHANT_TOOLS,
  CATEGORY_TABS,
  OPERATION_MODES,
} from '@/lib/hub/merchant-tools';

type Analytics = {
  totalSkus: number;
  lowStockCount: number;
  warehouseCapacity: number;
  todayRevenue: number;
  turnoverRate: number;
  topProducts: Array<{ name: string; soldQty: number; revenue: number }>;
  lowStockItems: Array<{ sku: string; name: string; stock: number; reorder: number }>;
};

export default function MerchantHubPage() {
  const [shopName, setShopName] = useState('Merchant Partner');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [analytics, setAnalytics] = useState<Analytics>({
    totalSkus: 0,
    lowStockCount: 0,
    warehouseCapacity: 45,
    todayRevenue: 0,
    turnoverRate: 18,
    topProducts: [],
    lowStockItems: [],
  });

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.shopName) setShopName(data.shopName);
      })
      .catch(() => {});

    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data) => {
        const stats = data.stats || data.metrics;
        if (data.success && stats) {
          setAnalytics({
            totalSkus: stats.totalSkus ?? 0,
            lowStockCount: stats.lowStockCount ?? 0,
            warehouseCapacity: stats.warehouseCapacity ?? 45,
            todayRevenue: stats.todayRevenue ?? stats.todaySalesLKR ?? 0,
            turnoverRate: stats.turnoverRate ?? 18,
            topProducts: stats.topProducts || [],
            lowStockItems: stats.lowStockItems || [],
          });
          if (data.orgName) setShopName(data.orgName);
        }
      })
      .catch(() => {});
  }, []);

  const filteredTools = useMemo(() => {
    return ALL_MERCHANT_TOOLS.filter((tool) => {
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q || tool.title.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const getCategoryCount = (category: string) =>
    category === 'all'
      ? ALL_MERCHANT_TOOLS.length
      : ALL_MERCHANT_TOOLS.filter((t) => t.category === category).length;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/90 via-zinc-900/40 to-zinc-950 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Owner Command Center
              </span>
              <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                AI Omnichannel Engine
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                {shopName}
              </span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm font-medium">
              Unified retail sales terminal, inventory warehouse radar, WhatsApp automation & multi-channel commerce.
            </p>
          </div>

          <Link
            href="/pos"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95 group cursor-pointer btn-press shrink-0"
          >
            <Zap className="w-5 h-5 fill-current group-hover:rotate-12 transition-transform" />
            <span>Launch Counter POS</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-extrabold text-white">Operation Mode Launcher</h2>
          <span className="text-xs text-zinc-500 font-medium">Select active business workflow</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {OPERATION_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <Link
                key={mode.id}
                href={mode.href}
                className={`group p-4 rounded-2xl border ${mode.border} bg-gradient-to-b ${mode.bgGradient} hover:bg-zinc-900/80 transition-all duration-300 flex flex-col justify-between space-y-3 shadow-lg hover:shadow-2xl hover:-translate-y-1 cursor-pointer`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className={`w-5 h-5 ${mode.textGlow}`} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition">Launch ↗</span>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition">{mode.title}</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{mode.subtitle}</p>
                </div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-950/60 text-zinc-300 w-fit">
                  {mode.badge}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-extrabold text-white">Operations & Stock Radar</h2>
            <span className="text-xs text-zinc-500 font-medium">Real-time inventory intelligence</span>
          </div>
          <Link href="/reports" className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer">
            Full Analytics Report <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl glass-card border border-zinc-800 space-y-2 hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Total Inventory Items</span>
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tabular-nums">{analytics.totalSkus.toLocaleString()}</span>
              <span className="text-xs font-bold text-emerald-400">Live SKUs</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-card border border-zinc-800 space-y-2 hover:border-amber-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Low Stock Warnings</span>
              <BellRing className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-400 tabular-nums">{analytics.lowStockCount}</span>
              <span className="text-xs font-bold text-amber-400/80">
                {analytics.lowStockCount > 0 ? 'Critical Reorder' : 'Stock Healthy'}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-card border border-zinc-800 space-y-2 hover:border-blue-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Warehouse Utilization</span>
              <Boxes className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-400 tabular-nums">{analytics.warehouseCapacity}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${analytics.warehouseCapacity}%` }} />
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-card border border-zinc-800 space-y-2 hover:border-purple-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Today Sales Volume</span>
              <DollarSign className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">
              LKR {analytics.todayRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-6 rounded-3xl glass-card border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Stock Velocity & Demand Trend
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-extrabold">
                {analytics.todayRevenue > 0
                  ? `LKR ${analytics.todayRevenue.toLocaleString()} Today`
                  : `${analytics.totalSkus} SKUs Monitored`}
              </span>
            </div>
            <div className="h-44 w-full relative pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <path d="M 0,110 Q 70,30 140,80 T 280,40 T 420,70 T 500,25 L 500,150 L 0,150 Z" fill="url(#waveGradient)" />
                <path
                  d="M 0,110 Q 70,30 140,80 T 280,40 T 420,70 T 500,25"
                  fill="none"
                  stroke="url(#lineStroke)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          <div className="p-6 rounded-3xl glass-card border border-zinc-800 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-400" />
                Inventory Turnover Velocity
              </h3>
            </div>
            <div className="flex flex-col items-center py-4">
              <span className="text-3xl font-black text-white tabular-nums">{analytics.turnoverRate}%</span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Fast Moving</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl glass-card border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-extrabold text-white">Critical Reorder Radar</h3>
              </div>
              <Link href="/products" className="text-xs text-zinc-400 hover:text-white cursor-pointer">
                Manage Catalog →
              </Link>
            </div>
            {analytics.lowStockItems.length === 0 ? (
              <p className="text-xs text-zinc-500 p-4 text-center glass-card rounded-xl border border-zinc-800/80">
                All inventory items are currently above minimum stock thresholds.
              </p>
            ) : (
              analytics.lowStockItems.map((item) => (
                <div
                  key={item.sku}
                  className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{item.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">SKU: {item.sku}</div>
                  </div>
                  <Link
                    href="/purchasing"
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold text-[10px] transition cursor-pointer"
                  >
                    + PO
                  </Link>
                </div>
              ))
            )}
          </div>

          <div className="p-5 rounded-3xl glass-card border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-extrabold text-white">Top Moving Hero Products</h3>
              </div>
              <Link href="/reports" className="text-xs text-zinc-400 hover:text-white cursor-pointer">
                View Ranking →
              </Link>
            </div>
            {analytics.topProducts.length === 0 ? (
              <p className="text-xs text-zinc-500 p-4 text-center glass-card rounded-xl border border-zinc-800/80">
                No sales recorded today yet. Completed orders will appear in rank order.
              </p>
            ) : (
              analytics.topProducts.map((p, idx) => (
                <div
                  key={p.name}
                  className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 font-black text-[11px] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="font-bold text-white truncate">{p.name}</div>
                  </div>
                  <div className="text-right shrink-0 font-extrabold text-emerald-400">
                    LKR {(p.revenue ?? 0).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-4 border-t border-zinc-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">Commercial Modules & Tools</h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Access all specialized apps for inventory, point of sale, marketing, debt ledgers & reports.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search tools, modules, reports…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {CATEGORY_TABS.map((cat) => {
            const count = getCategoryCount(cat.id);
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    isActive ? 'bg-zinc-950 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="group p-5 rounded-2xl glass-card border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all duration-300 flex flex-col justify-between space-y-4 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <Icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-white group-hover:text-emerald-400 transition">
                        {tool.title}
                      </h3>
                      {tool.badge && (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider mt-1 ${
                            tool.badgeType === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : tool.badgeType === 'purple'
                                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {tool.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{tool.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
