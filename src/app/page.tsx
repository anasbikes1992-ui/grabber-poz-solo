'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  Boxes,
  BookOpen,
  ArrowUpRight,
  ShoppingCart,
  Store,
  MessageSquare,
  Sparkles,
  Truck,
  ShieldCheck,
  Zap,
  Clock,
  ArrowDownRight,
  Package,
  Layers,
  Calculator,
  Barcode,
  Users,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

const RECENT_TRANSACTIONS = [
  { id: 'POS-2026-0091', channel: 'POS Counter', customer: 'Walk-in Cash Customer', amount: 10620.0, method: 'CASH', time: '5 mins ago', status: 'COMPLETED' },
  { id: 'WEB-2026-1044', channel: 'Web Storefront', customer: 'Nimal Silva', amount: 9440.0, method: 'CARD (PayHere)', time: '18 mins ago', status: 'IN_TRANSIT' },
  { id: 'POS-2026-0090', channel: 'POS Counter', customer: 'Sarath Perera', amount: 15340.0, method: 'POLIM_POTHA', time: '42 mins ago', status: 'COMPLETED' },
  { id: 'WA-2026-0312', channel: 'WhatsApp Bot', customer: 'Kamal Gunaratne', amount: 5310.0, method: 'COD (Prompt)', time: '1 hour ago', status: 'OUT_FOR_DELIVERY' },
];

const TOP_PRODUCTS = [
  { name: 'Linen Casual Shirt (Blue/L)', sku: 'LNN-SHT-BLU-L', sold: 42, revenue: 189000, progress: 85 },
  { name: 'Oxford Button-Down (White/M)', sku: 'OXF-SHT-WHT-M', sold: 31, revenue: 161200, progress: 68 },
  { name: 'Stretch Chino Trousers (Khaki/32)', sku: 'STC-CHN-KHK-32', sold: 19, revenue: 123500, progress: 48 },
  { name: 'Pique Cotton Polo (Navy/XL)', sku: 'PIQ-POL-NVY-XL', sold: 14, revenue: 53200, progress: 32 },
];

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEK' | 'MONTH'>('TODAY');

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome with Quick Action Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Solo Instance Live &bull; Colombo Flagship
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Executive Commerce Command Center
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time physical inventory, POS registers, automated WhatsApp orders, and double-entry general ledger.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/pos"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>Launch POS</span>
          </Link>
          <Link
            href="/shifts"
            className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border flex items-center gap-1.5 transition-all"
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Till & Z-Report</span>
          </Link>
          <Link
            href="/creative"
            className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>AI Studio</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Gross Revenue */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Today&apos;s Gross Sales</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground">LKR 47,790.00</h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+14.8% vs yesterday</span>
            </p>
          </div>
          <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50 flex justify-between font-medium">
            <span>POS: 65%</span>
            <span>Web: 25%</span>
            <span>WA: 10%</span>
          </div>
        </div>

        {/* 2. Physical Stock On Hand */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Physical Stock In Hubs</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground">76 Units</h3>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1 font-semibold">
              <span>Main Branch: 31 &bull; Central WH: 45</span>
            </p>
          </div>
          <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50 flex justify-between font-medium">
            <span>Reserved: 0</span>
            <span className="text-emerald-600 font-semibold">Ledger Invariant: 100% OK</span>
          </div>
        </div>

        {/* 3. Polim Potha AR */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Polim Potha Credit (AR)</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground">LKR 11,240.00</h3>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1 font-semibold">
              <span>100% in 0–30 days healthy bucket</span>
            </p>
          </div>
          <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50 flex justify-between font-medium">
            <span>4 Active Debtors</span>
            <span className="text-emerald-600 font-semibold">Overdue: LKR 0.00</span>
          </div>
        </div>

        {/* 4. Suppliers & AP */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Supplier Payables (AP)</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2">
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground">LKR 250,000.00</h3>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-1 font-semibold">
              <span>Lanka Textiles Ltd &bull; Due in 28d</span>
            </p>
          </div>
          <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50 flex justify-between font-medium">
            <span>PO-2026-004 GRN Matched</span>
            <span className="text-emerald-600 font-semibold">Net 30 Terms</span>
          </div>
        </div>
      </div>

      {/* Hourly Sales Sparkline & Performance Visualizer */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-foreground">Intraday Sales Velocity</h3>
            <p className="text-[11px] text-muted-foreground">Live transaction volume distributed across business hours</p>
          </div>
          <div className="flex bg-secondary rounded-lg p-0.5 border border-border text-[11px] font-semibold">
            {(['TODAY', 'WEEK', 'MONTH'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-md transition-all ${
                  timeRange === r ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Bar Chart Simulator */}
        <div className="h-28 flex items-end justify-between gap-2 pt-4 px-2 border-b border-border/60">
          {[
            { label: '08:00', val: 15, lkr: '4.5k' },
            { label: '10:00', val: 35, lkr: '12.2k' },
            { label: '12:00', val: 65, lkr: '21.5k' },
            { label: '14:00', val: 45, lkr: '14.8k' },
            { label: '16:00', val: 85, lkr: '31.2k' },
            { label: '18:00', val: 95, lkr: '47.8k' },
            { label: '20:00', val: 40, lkr: '18.0k' },
          ].map((bar) => (
            <div key={bar.label} className="flex-1 flex flex-col items-center gap-1 group">
              <span className="text-[9px] font-mono font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                {bar.lkr}
              </span>
              <div
                style={{ height: `${bar.val}%` }}
                className="w-full max-w-[36px] bg-gradient-to-t from-primary/60 to-primary rounded-t-lg transition-all group-hover:from-primary group-hover:to-blue-400 group-hover:scale-105"
              />
              <span className="text-[10px] text-muted-foreground font-medium mt-1">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Recent Live Transactions vs Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Live Transactions Feed */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Live Omnichannel Orders</h3>
            <span className="text-[11px] text-muted-foreground">POS &bull; Web &bull; WhatsApp</span>
          </div>

          <div className="space-y-2.5">
            {RECENT_TRANSACTIONS.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-xl bg-secondary/50 border border-border/40 flex items-center justify-between text-xs hover:bg-secondary transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{tx.id}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      tx.channel === 'POS Counter'
                        ? 'bg-blue-500/10 text-blue-600'
                        : tx.channel === 'Web Storefront'
                        ? 'bg-purple-500/10 text-purple-600'
                        : 'bg-emerald-500/10 text-emerald-600'
                    }`}>
                      {tx.channel}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{tx.customer} &bull; {tx.time}</p>
                </div>

                <div className="text-right space-y-0.5">
                  <p className="font-extrabold text-foreground font-mono">LKR {tx.amount.toLocaleString()}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground font-medium">
                    {tx.method}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Top Selling Products Leaderboard */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Top Performing SKUs</h3>
            <span className="text-[11px] text-muted-foreground">By Revenue</span>
          </div>

          <div className="space-y-3">
            {TOP_PRODUCTS.map((prod, idx) => (
              <div key={prod.sku} className="space-y-1.5 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="truncate pr-2 text-foreground">
                    #{idx + 1} {prod.name}
                  </span>
                  <span className="font-mono font-bold text-foreground">LKR {prod.revenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{prod.sku}</span>
                  <span>{prod.sold} units sold</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    style={{ width: `${prod.progress}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
