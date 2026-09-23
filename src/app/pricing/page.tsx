import React from 'react';
import Link from 'next/link';
import { Check, HelpCircle, ShieldCheck, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Pricing & Licensing — Grabber Business OS Pro',
  description:
    'One all-in-one Grabber Business OS Pro plan, configured by vertical pack for Sri Lankan SMEs.',
};

const included = [
  'Counter POS, barcode scanning, shifts, and thermal receipts',
  'Products, variants, inventory, branches, warehouses, transfers, and GRN',
  'Customers, Polim Potha credit ledger, quotations, orders, and returns',
  'Public storefront, product pages, COD checkout, SEO metadata, and store builder',
  'Jarvis and agents in READ/DRAFT mode with approval-controlled execution',
  'Dedicated deployment, backups, updates, monitoring, and support',
];

const verticalPacks = [
  'Retail & Wholesale',
  'Electronics & Repairs',
  'Restaurant / Cafe',
  'Salon / Services',
  'Party / Events',
  'Grocery / Pharmacy readiness later',
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-12 px-4 sm:px-6 lg:px-8 space-y-16">
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ONE PRO PLAN · DEDICATED BUSINESS DEPLOYMENT</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-stone-100">
          Every client gets Grabber Business OS Pro.
          <span className="block text-emerald-400 mt-1">We configure it for your business category.</span>
        </h1>
        <p className="text-base sm:text-lg text-stone-400 max-w-2xl mx-auto">
          No confusing package tiers. Pricing changes by implementation size, migration,
          branches, hardware, and SLA — not by locking features away.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-3xl border-2 border-emerald-500/60 bg-stone-900 p-8 shadow-xl shadow-emerald-950/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
                All-in-one SME operating system
              </div>
              <h2 className="text-3xl font-black text-white">Grabber Business OS Pro</h2>
              <p className="mt-3 text-sm text-stone-400">
                One-time license/setup plus monthly cloud, backups, updates, monitoring, and support.
                Exact quote is based on signed implementation scope.
              </p>
            </div>
            <Sparkles className="h-8 w-8 shrink-0 text-emerald-400" />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {included.map((feature) => (
              <div key={feature} className="flex items-start gap-2.5 rounded-2xl border border-stone-800 bg-stone-950/40 p-3 text-sm text-stone-300">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <Link
            href="/#contact"
            className="mt-8 inline-flex rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-3 text-sm font-black text-stone-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-teal-300"
          >
            Request Pro Quote
          </Link>
        </section>

        <aside className="rounded-3xl border border-stone-800 bg-stone-900 p-6">
          <h3 className="text-lg font-bold text-white">Vertical packs</h3>
          <p className="mt-2 text-xs text-stone-400">
            Pick the business category. The core Pro system stays the same.
          </p>
          <div className="mt-5 space-y-2">
            {verticalPacks.map((pack) => (
              <div key={pack} className="rounded-xl border border-stone-800 bg-stone-950/40 px-3 py-2 text-xs font-semibold text-stone-300">
                {pack}
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="max-w-3xl mx-auto space-y-6 pt-8 border-t border-stone-800">
        <h3 className="text-xl font-bold text-stone-100 text-center flex items-center justify-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-400" /> Frequently Asked Questions
        </h3>
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5">
            <h4 className="font-bold text-stone-200">What changes the price?</h4>
            <p className="text-stone-400 leading-relaxed">
              Migration size, branch count, hardware, custom reports, provider setup, onsite training, and SLA.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5">
            <h4 className="font-bold text-stone-200">Is Jarvis included?</h4>
            <p className="text-stone-400 leading-relaxed">
              Yes. Jarvis and agents are included with safe READ/DRAFT behavior. Any risky execution remains approval-controlled.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5">
            <h4 className="font-bold text-stone-200">Are third-party providers included?</h4>
            <p className="text-stone-400 leading-relaxed">
              Integration support can be quoted, but provider fees and credentials belong to the client.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
