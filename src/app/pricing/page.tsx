import React from 'react';
import { ModularPricingCalculator } from '@/components/marketing/pricing-calculator';
import { ShieldCheck, Server, Database, Sparkles, Check, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Pricing & Licensing — Grabber Business OS',
  description:
    'Transparent perpetual licensing and managed cloud infrastructure for Sri Lankan retail, electronics, fashion, and restaurants.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-12 px-4 sm:px-6 lg:px-8 space-y-16">
      {/* Hero Header */}
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>PERPETUAL BUSINESS LICENSE · ZERO SAAS LOCK-IN</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-stone-100">
          Buy your business software once.
          <span className="block text-emerald-400 mt-1">Pay only for what actually recurs.</span>
        </h1>
        <p className="text-base sm:text-lg text-stone-400 max-w-2xl mx-auto">
          No monthly rent that holds your customer debt or store records hostage. You receive a dedicated private cloud environment, an isolated database, and full business ownership.
        </p>
      </div>

      {/* Package Tiers Overview */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Starter */}
        <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Core Single Store</span>
            <h3 className="text-2xl font-bold text-stone-100">Starter</h3>
            <div className="pt-2">
              <span className="text-3xl font-extrabold text-stone-100">LKR 125,000</span>
              <span className="text-xs text-stone-400 block mt-0.5">One-time license & implementation</span>
            </div>
            <p className="text-xs text-stone-400">
              + <strong className="text-emerald-400">LKR 5,000/mo</strong> for dedicated cloud, backups, and support.
            </p>
            <ul className="space-y-2 text-xs text-stone-300 pt-4 border-t border-stone-800">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>1 Counter POS Register + Cash Drawer</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Real-time COD Web Storefront</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Polim Potha Customer Credit Ledger</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>500 SKU Catalog Migration & Setup</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Isolated PostgreSQL Database</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Business Growth */}
        <div className="p-6 rounded-2xl bg-stone-900 border-2 border-emerald-500/60 shadow-xl shadow-emerald-950/30 flex flex-col justify-between space-y-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-stone-950 font-bold text-[10px] rounded-full uppercase tracking-wider">
            Most Popular
          </div>
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Multi-Branch Retail</span>
            <h3 className="text-2xl font-bold text-stone-100">Business Growth</h3>
            <div className="pt-2">
              <span className="text-3xl font-extrabold text-stone-100">LKR 250,000</span>
              <span className="text-xs text-stone-400 block mt-0.5">One-time license & implementation</span>
            </div>
            <p className="text-xs text-stone-400">
              + <strong className="text-emerald-400">LKR 10,000/mo</strong> for dedicated cloud, priority support.
            </p>
            <ul className="space-y-2 text-xs text-stone-300 pt-4 border-t border-stone-800">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Up to 3 Branches + Central Warehouse</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Automated WhatsApp Commerce (COMMS)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Full Double-Entry GL & P&L Statements</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>AI Social Hub C0 & Banner Builder</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>5 Monthly AI Video Ad Credits Included</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Enterprise */}
        <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Chains & On-Premise</span>
            <h3 className="text-2xl font-bold text-stone-100">Enterprise</h3>
            <div className="pt-2">
              <span className="text-3xl font-extrabold text-stone-100">LKR 450,000+</span>
              <span className="text-xs text-stone-400 block mt-0.5">Custom architecture & deployment</span>
            </div>
            <p className="text-xs text-stone-400">
              Monthly cloud management or self-hosted Annual Maintenance (AMC).
            </p>
            <ul className="space-y-2 text-xs text-stone-300 pt-4 border-t border-stone-800">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Unlimited Branches & Register Lanes</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Optional Self-Hosted on Client VPS/Server</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Custom ERP & Legacy Accounting Bridges</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Dedicated SLA & On-Site Engineering</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Interactive Custom Addon Calculator */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-stone-100">Interactive Modular Add-on Calculator</h2>
          <p className="text-xs text-stone-400 mt-1">
            Customize optional vertical modules (Repairs, Hire Purchase, Polim Potha, KDS) and preview your exact investment.
          </p>
        </div>
        <ModularPricingCalculator />
      </div>

      {/* Frequently Asked Questions */}
      <div className="max-w-3xl mx-auto space-y-6 pt-8 border-t border-stone-800">
        <h3 className="text-xl font-bold text-stone-100 text-center flex items-center justify-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-400" /> Frequently Asked Questions
        </h3>

        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5">
            <h4 className="font-bold text-stone-200">What does the one-time software license mean?</h4>
            <p className="text-stone-400 leading-relaxed">
              You receive a perpetual single-business usage license to operate Grabber Business OS for your store. You own your deployment and business data forever. We do not lock you out or hike SaaS rent.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5">
            <h4 className="font-bold text-stone-200">What does the monthly fee cover?</h4>
            <p className="text-stone-400 leading-relaxed">
              The monthly fee strictly covers real infrastructure expenses: your dedicated high-speed cloud VPS, isolated PostgreSQL database, daily off-site encrypted backups, uptime monitoring, security patches, and direct WhatsApp technical support.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5">
            <h4 className="font-bold text-stone-200">Can I bring my own POS hardware?</h4>
            <p className="text-stone-400 leading-relaxed">
              Yes! Grabber Business OS supports standard USB/Bluetooth 2D barcode scanners, 80mm ESC/POS thermal receipt printers (Epson, Birch, Xprinter), and RJ11 cash drawers out of the box.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
