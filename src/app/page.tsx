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
  TrendingUp,
  Boxes,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  Activity,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';

const OPERATION_MODES = [
  {
    title: 'Retail Mode',
    desc: 'Fast Barcode & Cashier',
    badge: 'FAST 3S RING-UP',
    href: '/pos',
    icon: ShoppingCart,
    border: 'border-cyan-500/40 hover:border-cyan-400 hover:shadow-cyan-500/20',
    iconBg: 'bg-cyan-500/10 text-cyan-400',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  {
    title: 'Restaurant & KOT',
    desc: 'Table Map & Kitchen Orders',
    badge: 'TABLE MANAGEMENT',
    href: '/restaurant',
    icon: UtensilsCrossed,
    border: 'border-amber-500/40 hover:border-amber-400 hover:shadow-amber-500/20',
    iconBg: 'bg-amber-500/10 text-amber-400',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  {
    title: 'Repair & Job Sheet',
    desc: 'Job Cards & Intake Slips',
    badge: 'JOB SHEET GENERATOR',
    href: '/repairs',
    icon: Wrench,
    border: 'border-blue-500/40 hover:border-blue-400 hover:shadow-blue-500/20',
    iconBg: 'bg-blue-500/10 text-blue-400',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  {
    title: 'Hire Purchase',
    desc: 'Installment Contracts & NIC',
    badge: 'MICRO-CREDIT',
    href: '/hire-purchase',
    icon: CreditCard,
    border: 'border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-500/20',
    iconBg: 'bg-emerald-500/10 text-emerald-400',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    title: 'B2B Quotations',
    desc: 'Wholesale & Proforma Bills',
    badge: 'PROFORMA SUITE',
    href: '/wholesale',
    icon: Building2,
    border: 'border-purple-500/40 hover:border-purple-400 hover:shadow-purple-500/20',
    iconBg: 'bg-purple-500/10 text-purple-400',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  {
    title: 'Appointments',
    desc: 'Client Slots & Specialists',
    badge: 'BOOKING HUB',
    href: '/appointments',
    icon: Calendar,
    border: 'border-teal-500/40 hover:border-teal-400 hover:shadow-teal-500/20',
    iconBg: 'bg-teal-500/10 text-teal-400',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Hero Command Center Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0F172A]/90 via-[#0B0F17]/90 to-[#020617] border border-white/10 p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              OWNER COMMAND CENTER
            </span>
            <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              AI OMNICHANNEL ENGINE
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Welcome back, <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Shopping Station</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            Unified retail sales terminal, inventory warehouse radar, WhatsApp automation & multi-channel commerce.
          </p>
        </div>

        <div className="z-10 shrink-0">
          <Link
            href="/pos"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-extrabold text-xs sm:text-sm flex items-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-105 active:scale-95"
          >
            <Zap className="h-4 w-4 fill-black" />
            <span>Launch Counter POS &rarr;</span>
          </Link>
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Operation Mode Launcher */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
            ⚡
          </div>
          <h2 className="text-sm font-bold text-white tracking-wide">Operation Mode Launcher</h2>
          <span className="text-xs text-slate-400">&bull; Select active business workflow</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {OPERATION_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <Link
                key={mode.title}
                href={mode.href}
                className={`p-4 rounded-2xl bg-[#0F172A]/60 backdrop-blur-md border ${mode.border} transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-lg aspect-[4/3]`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className={`h-8 w-8 rounded-xl ${mode.iconBg} flex items-center justify-center`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] text-slate-400 group-hover:text-white flex items-center gap-0.5 font-medium">
                      Launch <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-white mt-3 leading-snug group-hover:text-cyan-300 transition-colors">
                    {mode.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{mode.desc}</p>
                </div>

                <div className="pt-2">
                  <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-md border block text-center uppercase tracking-wider ${mode.badgeColor}`}>
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
            <Activity className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">Operations & Stock Radar</h2>
            <span className="text-xs text-slate-400">&bull; Real-time inventory intelligence</span>
          </div>

          <Link href="/accounts" className="text-xs font-semibold text-cyan-400 hover:underline">
            Full Analytics Report &rarr;
          </Link>
        </div>

        {/* 4 Radar Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0F172A]/70 border border-white/10 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Total Inventory Items</span>
              <Boxes className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">1,613</span>
              <span className="text-xs font-bold text-emerald-400">Live SKUs</span>
            </div>
            <p className="text-[10px] text-slate-400">Active catalog items across all branches</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F172A]/70 border border-white/10 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Low Stock Warnings</span>
              <span className="text-amber-400 font-bold text-xs">⚠️</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">0</span>
              <span className="text-xs font-bold text-emerald-400">Stock Healthy</span>
            </div>
            <p className="text-[10px] text-slate-400">Items below minimum reorder threshold</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F172A]/70 border border-white/10 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Warehouse Utilization</span>
              <span className="text-blue-400 font-bold text-xs">📦</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-cyan-400">45%</span>
              <span className="text-xs font-bold text-slate-300">Optimal Space</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 w-[45%] rounded-full" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F172A]/70 border border-white/10 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Today Sales Volume</span>
              <span className="text-purple-400 font-bold text-xs">💰</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">LKR 47,790</span>
            </div>
            <p className="text-[10px] text-slate-400">Omnichannel: POS + Web Store + WhatsApp</p>
          </div>
        </div>

        {/* 4. Stock Velocity Graph & Inventory Turnover Meter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Velocity Trend Spline Graph (8 Cols) */}
          <div className="lg:col-span-8 p-5 rounded-2xl bg-[#0F172A]/80 border border-white/10 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <div>
                <h3 className="font-bold text-white">Stock Velocity & Demand Trend</h3>
                <p className="text-[10px] text-slate-400">Moving average stock consumption rate</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                1,613 SKUs Monitored
              </span>
            </div>

            {/* Simulated Animated Curved Spline */}
            <div className="h-36 w-full relative flex items-end justify-between pt-6 px-2">
              <svg className="w-full h-full absolute inset-0 overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
                <defs>
                  <linearGradient id="gradSpline" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
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
                  stroke="#00F298"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Node Points */}
                <circle cx="150" cy="55" r="4" fill="#00F298" />
                <circle cx="300" cy="75" r="4" fill="#00F298" />
                <circle cx="450" cy="20" r="4" fill="#00F298" />
              </svg>
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-white/5">
              <span>08:00</span>
              <span>10:00</span>
              <span>12:00</span>
              <span>14:00</span>
              <span>16:00</span>
              <span>18:00</span>
              <span>20:00</span>
            </div>
          </div>

          {/* Turnover Velocity Speedometer (4 Cols) */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-[#0F172A]/80 border border-white/10 flex flex-col justify-between text-xs">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white">Inventory Turnover Velocity</h3>
            </div>
            <p className="text-[10px] text-slate-400">Annualized stock circulation health</p>

            {/* Circular Gauge Meter */}
            <div className="my-4 flex flex-col items-center justify-center relative">
              <div className="h-28 w-28 rounded-full border-8 border-white/5 border-t-cyan-400 border-r-emerald-400 flex flex-col items-center justify-center transform -rotate-45">
                <span className="text-xl font-extrabold text-white transform rotate-45">18%</span>
                <span className="text-[9px] font-bold text-cyan-400 transform rotate-45 uppercase tracking-wider">Fast Moving</span>
              </div>
            </div>

            <div className="flex justify-between text-[9px] text-slate-400 pt-2 border-t border-white/5">
              <span>Slow (0%)</span>
              <span className="text-cyan-400 font-bold">Target (65%)</span>
              <span>Elite (100%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
