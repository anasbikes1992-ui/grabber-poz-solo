'use client';

import React from 'react';
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
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Solo Instance Live
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Colombo Flagship Commerce Hub
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Single-business database with active physical inventory & financial double-entry ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/pos"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs flex items-center gap-2 shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>Launch POS Counter</span>
          </Link>
          <Link
            href="/creative"
            className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs border border-border flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>Studio</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Gross Revenue */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Today&apos;s Sales</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="my-3">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">LKR 47,790.00</h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
              <TrendingUp className="h-3 w-3" />
              <span>+14.8% vs yesterday</span>
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/50 flex justify-between">
            <span>POS: 65%</span>
            <span>Web: 25%</span>
            <span>WA: 10%</span>
          </div>
        </div>

        {/* 2. Physical Stock On Hand */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Physical Stock</span>
            <Boxes className="h-4 w-4 text-blue-500" />
          </div>
          <div className="my-3">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">76 Units</h3>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1 font-medium">
              <span>Colombo Branch: 31 | Central WH: 45</span>
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/50 flex justify-between">
            <span>Reserved: 0</span>
            <span className="text-emerald-600 font-medium">Ledger: Verified</span>
          </div>
        </div>

        {/* 3. Polim Potha AR */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Polim Potha (AR)</span>
            <BookOpen className="h-4 w-4 text-amber-500" />
          </div>
          <div className="my-3">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">LKR 11,240.00</h3>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1 font-medium">
              <span>100% in 0–30 days bucket</span>
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/50 flex justify-between">
            <span>Active Customers: 4</span>
            <span className="text-emerald-600 font-medium">Overdue: LKR 0</span>
          </div>
        </div>

        {/* 4. Suppliers & AP */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Accounts Payable</span>
            <Truck className="h-4 w-4 text-purple-500" />
          </div>
          <div className="my-3">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">LKR 250,000.00</h3>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-1 font-medium">
              <span>Lanka Textiles Ltd (Due in 28d)</span>
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/50 flex justify-between">
            <span>PO Status: Received</span>
            <span className="text-emerald-600 font-medium">Matched to GRN</span>
          </div>
        </div>
      </div>

      {/* Grid: Channel Breakdown & Stock Ledger Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sales Channels & Operations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Channel Activity */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-foreground">Channel Operations</h3>
              <span className="text-xs text-muted-foreground">Real-time Order Feed</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">POS-2026-1001 (Colombo Main Branch)</p>
                    <p className="text-[11px] text-muted-foreground">2x Linen Casual Shirt &bull; Cash + Card Tender</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-foreground">LKR 10,620.00</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">DELIVERED</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">WEB-2026-2001 (Storefront Order)</p>
                    <p className="text-[11px] text-muted-foreground">3x Linen Casual Shirt &bull; PayHere Online</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-foreground">LKR 15,930.00</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold">DISPATCHED</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">WA-2026-3001 (WhatsApp Hotline)</p>
                    <p className="text-[11px] text-muted-foreground">1x Linen Casual Shirt &bull; COD Koombiyo Courier</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-foreground">LKR 5,310.00</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">COLLECTED</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Operations Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/pos" className="p-3.5 rounded-xl bg-card border border-border/80 hover:border-primary/50 transition-all text-center group">
              <ShoppingCart className="h-5 w-5 mx-auto mb-1.5 text-primary group-hover:scale-110 transition-transform" />
              <p className="text-xs font-semibold text-foreground">POS Counter</p>
              <p className="text-[10px] text-muted-foreground">Fast Checkout</p>
            </Link>

            <Link href="/inventory" className="p-3.5 rounded-xl bg-card border border-border/80 hover:border-primary/50 transition-all text-center group">
              <Boxes className="h-5 w-5 mx-auto mb-1.5 text-blue-500 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-semibold text-foreground">Stock Transfer</p>
              <p className="text-[10px] text-muted-foreground">WH &harr; Branch</p>
            </Link>

            <Link href="/polim-potha" className="p-3.5 rounded-xl bg-card border border-border/80 hover:border-primary/50 transition-all text-center group">
              <BookOpen className="h-5 w-5 mx-auto mb-1.5 text-amber-500 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-semibold text-foreground">Polim Potha</p>
              <p className="text-[10px] text-muted-foreground">Credit & Aging</p>
            </Link>

            <Link href="/creative" className="p-3.5 rounded-xl bg-card border border-border/80 hover:border-primary/50 transition-all text-center group">
              <Sparkles className="h-5 w-5 mx-auto mb-1.5 text-indigo-500 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-semibold text-foreground">Studio AI</p>
              <p className="text-[10px] text-muted-foreground">Video Campaigns</p>
            </Link>
          </div>
        </div>

        {/* Right Col: Ledger Mathematical Invariants Proof */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <h3 className="font-semibold text-sm text-foreground">Ledger Invariant Audit</h3>
            </div>
            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
              Mathematical invariants verified across physical stock movements and double-entry general ledger.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-secondary/60 border border-border/40">
                <div className="flex justify-between font-medium">
                  <span>Stock Ledger Balance</span>
                  <span className="text-emerald-600 font-bold">100% Invariant Match</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Opening(0) + GRN(100) - Sales(10) = 76 Units</p>
              </div>

              <div className="p-2.5 rounded-xl bg-secondary/60 border border-border/40">
                <div className="flex justify-between font-medium">
                  <span>Accounting Ledger</span>
                  <span className="text-emerald-600 font-bold">&Delta; Debits - Credits = 0.00</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">All 14 journal lines mathematically balanced</p>
              </div>

              <div className="p-2.5 rounded-xl bg-secondary/60 border border-border/40">
                <div className="flex justify-between font-medium">
                  <span>Customer Credit (AR)</span>
                  <span className="text-emerald-600 font-bold">Verified</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Invoice (21,240) - Cash Repayment (10,000) = 11,240</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
