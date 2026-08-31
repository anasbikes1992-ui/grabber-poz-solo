'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  UtensilsCrossed,
  Wrench,
  CreditCard,
  Building2,
  Calendar,
  Zap,
  Boxes,
  ArrowUpRight,
  Activity,
  Package,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

const OPERATION_MODES = [
  {
    title: 'Retail Mode',
    desc: 'Fast Barcode & Cashier',
    badge: 'FAST 3S RING-UP',
    href: '/pos',
    icon: ShoppingCart,
  },
  {
    title: 'Restaurant & KOT',
    desc: 'Table Map & Kitchen Orders',
    badge: 'TABLE MANAGEMENT',
    href: '/restaurant',
    icon: UtensilsCrossed,
  },
  {
    title: 'Repair & Job Sheet',
    desc: 'Job Cards & Intake Slips',
    badge: 'JOB SHEET GENERATOR',
    href: '/repairs',
    icon: Wrench,
  },
  {
    title: 'Hire Purchase',
    desc: 'Installment Contracts & NIC',
    badge: 'MICRO-CREDIT',
    href: '/hire-purchase',
    icon: CreditCard,
  },
  {
    title: 'B2B Quotations',
    desc: 'Wholesale & Proforma Bills',
    badge: 'PROFORMA SUITE',
    href: '/wholesale',
    icon: Building2,
  },
  {
    title: 'Appointments',
    desc: 'Client Slots & Specialists',
    badge: 'BOOKING HUB',
    href: '/appointments',
    icon: Calendar,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Hero Command Center Banner */}
      <div className="relative rounded-2xl glass-card glow-border-emerald p-6 sm:p-8 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              OWNER COMMAND CENTER
            </span>
            <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] font-bold tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              AI OMNICHANNEL ENGINE
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Welcome back, <span className="text-emerald-400">Shopping Station</span>
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
            Unified retail sales terminal, inventory warehouse radar, WhatsApp automation & multi-channel commerce.
          </p>
        </div>

        <div className="z-10 shrink-0">
          <Link
            href="/pos"
            className="px-6 py-3.5 min-h-12 rounded-xl bg-emerald-500 text-zinc-950 font-extrabold text-xs sm:text-sm flex items-center gap-2.5 shadow-glow-em hover:bg-emerald-400 transition-all duration-200 cursor-pointer btn-press"
          >
            <Zap className="h-4 w-4" />
            <span>Launch Counter POS &rarr;</span>
          </Link>
        </div>
      </div>

      {/* 2. Operation Mode Launcher */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Zap className="h-3 w-3" />
          </div>
          <h2 className="text-sm font-bold text-foreground tracking-wide">Operation Mode Launcher</h2>
          <span className="text-xs text-muted-foreground">&bull; Select active business workflow</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {OPERATION_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <Link
                key={mode.title}
                href={mode.href}
                className="p-4 rounded-2xl glass-card glass-card-hover flex flex-col justify-between group aspect-[4/3] cursor-pointer transition-all duration-200"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] text-muted-foreground group-hover:text-emerald-400 flex items-center gap-0.5 font-medium transition-colors duration-200">
                      Launch <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-foreground mt-3 leading-snug group-hover:text-emerald-400 transition-colors duration-200">
                    {mode.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{mode.desc}</p>
                </div>

                <div className="pt-2">
                  <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-md border border-zinc-800 bg-zinc-900/80 text-zinc-400 block text-center uppercase tracking-wider">
                    {mode.badge}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Operations & Stock Radar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-foreground tracking-wide">Operations & Stock Radar</h2>
            <span className="text-xs text-muted-foreground">&bull; Real-time inventory intelligence</span>
          </div>

          <Link
            href="/accounts"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors duration-200 cursor-pointer"
          >
            Full Analytics Report &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl glass-card space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Total Inventory Items</span>
              <Boxes className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground tabular-nums">1,613</span>
              <span className="text-xs font-bold text-emerald-400">Live SKUs</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Active catalog items across all branches</p>
          </div>

          <div className="p-4 rounded-2xl glass-card space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Low Stock Warnings</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground tabular-nums">0</span>
              <span className="text-xs font-bold text-emerald-400">Stock Healthy</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Items below minimum reorder threshold</p>
          </div>

          <div className="p-4 rounded-2xl glass-card space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Warehouse Utilization</span>
              <Package className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-400 tabular-nums">45%</span>
              <span className="text-xs font-bold text-zinc-300">Optimal Space</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-1">
              <div className="h-full bg-emerald-500 w-[45%] rounded-full" />
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-card space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Today Sales Volume</span>
              <CreditCard className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground tabular-nums">LKR 47,790</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Omnichannel: POS + Web Store + WhatsApp</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 p-5 rounded-2xl glass-card space-y-4">
            <div className="flex justify-between items-center text-xs">
              <div>
                <h3 className="font-bold text-foreground">Stock Velocity & Demand Trend</h3>
                <p className="text-[10px] text-muted-foreground">Moving average stock consumption rate</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                1,613 SKUs Monitored
              </span>
            </div>

            <div className="h-36 w-full relative flex items-end justify-between pt-6 px-2">
              <svg className="w-full h-full absolute inset-0 overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
                <defs>
                  <linearGradient id="gradSpline" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,80 Q 80,95 150,55 T 300,75 T 450,20 L 500,25 L 500,100 L 0,100 Z"
                  fill="url(#gradSpline)"
                />
                <path
                  d="M 0,80 Q 80,95 150,55 T 300,75 T 450,20 L 500,25"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="150" cy="55" r="4" fill="#10B981" />
                <circle cx="300" cy="75" r="4" fill="#10B981" />
                <circle cx="450" cy="20" r="4" fill="#10B981" />
              </svg>
            </div>

            <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-800">
              <span>08:00</span>
              <span>10:00</span>
              <span>12:00</span>
              <span>14:00</span>
              <span>16:00</span>
              <span>18:00</span>
              <span>20:00</span>
            </div>
          </div>

          <div className="lg:col-span-4 p-5 rounded-2xl glass-card flex flex-col justify-between text-xs">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-foreground">Inventory Turnover Velocity</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">Annualized stock circulation health</p>

            <div className="my-4 flex flex-col items-center justify-center relative">
              <div className="h-28 w-28 rounded-full border-8 border-zinc-800 border-t-emerald-400 border-r-emerald-500 flex flex-col items-center justify-center transform -rotate-45">
                <span className="text-xl font-extrabold text-foreground transform rotate-45 tabular-nums">18%</span>
                <span className="text-[9px] font-bold text-emerald-400 transform rotate-45 uppercase tracking-wider">Fast Moving</span>
              </div>
            </div>

            <div className="flex justify-between text-[9px] text-muted-foreground pt-2 border-t border-zinc-800">
              <span>Slow (0%)</span>
              <span className="text-emerald-400 font-bold">Target (65%)</span>
              <span>Elite (100%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
