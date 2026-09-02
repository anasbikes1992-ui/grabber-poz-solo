'use client';

import React, { useState } from 'react';
import { Check, ShieldCheck, Sparkles, Zap, MessageCircle, HelpCircle } from 'lucide-react';

export type ModularAddon = {
  id: string;
  name: string;
  category: string;
  description: string;
  setupFeeLkr: number;
  monthlyFeeLkr: number;
  recommendedFor: string;
  iconName?: string;
};

export const MODULE_CATALOG: ModularAddon[] = [
  {
    id: 'repairs',
    name: 'Mobile & Electronics Repair Ticket Module',
    category: 'Electronics & Repairs',
    description: 'Device intake tickets, technician assignment, IMEI 360° audit, and device trade-in calculator.',
    setupFeeLkr: 35000,
    monthlyFeeLkr: 2500,
    recommendedFor: 'Phone & Tech Repair Shops',
  },
  {
    id: 'hirePurchase',
    name: 'Hire Purchase (HP) Installment Engine',
    category: 'Financing',
    description: 'HP agreement generator, monthly EMI schedules, and automated WhatsApp overdue reminders.',
    setupFeeLkr: 30000,
    monthlyFeeLkr: 2000,
    recommendedFor: 'Electronics & Appliance Retailers',
  },
  {
    id: 'polimPotha',
    name: 'Polim Potha B2B Customer Credit Ledger',
    category: 'Credit & Accounts',
    description: 'Credit limit enforcement, 30/60/90 day AR aging analysis, and WhatsApp payment links.',
    setupFeeLkr: 25000,
    monthlyFeeLkr: 1500,
    recommendedFor: 'Wholesalers & Hardware Shops',
  },
  {
    id: 'restaurant',
    name: 'Restaurant & Café KDS Module',
    category: 'Food & Beverage',
    description: 'Visual table grid layout, Kitchen Display System (KDS), and Recipe BOM ingredient deduction.',
    setupFeeLkr: 35000,
    monthlyFeeLkr: 2500,
    recommendedFor: 'Restaurants, Cafés & Bakeries',
  },
  {
    id: 'creative',
    name: 'AI Creative Studio & Media Factory',
    category: 'Marketing Automation',
    description: 'Automated video ad generator, social media reels builder, and product explainer video pipeline.',
    setupFeeLkr: 45000,
    monthlyFeeLkr: 3500,
    recommendedFor: 'Marketing Growth Merchants',
  },
];

export const BASE_SETUP_LKR = 95000;
export const BASE_MONTHLY_LKR = 4900;

export function ModularPricingCalculator() {
  const [selectedModules, setSelectedModules] = useState<string[]>(['repairs']);
  const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const selectedAddons = MODULE_CATALOG.filter((m) => selectedModules.includes(m.id));

  const totalSetupLkr = BASE_SETUP_LKR + selectedAddons.reduce((sum, m) => sum + m.setupFeeLkr, 0);
  const rawMonthlyLkr = BASE_MONTHLY_LKR + selectedAddons.reduce((sum, m) => sum + m.monthlyFeeLkr, 0);
  
  // 15% discount on annual billing for monthly cloud maintenance
  const finalMonthlyLkr = billingPeriod === 'ANNUAL' ? Math.round(rawMonthlyLkr * 0.85) : rawMonthlyLkr;

  const whatsappMessage = encodeURIComponent(
    `Hi Grabber Team! I customized a setup plan on your pricing page:\n\n` +
    `• Setup Total: LKR ${totalSetupLkr.toLocaleString()}\n` +
    `• Monthly Cloud: LKR ${finalMonthlyLkr.toLocaleString()}/mo (${billingPeriod})\n` +
    `• Modules Selected: ${selectedAddons.map((a) => a.name).join(', ') || 'Core Platform Only'}\n\n` +
    `I would like to book a 5-minute live tablet demo for my store.`
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-stone-900 border border-amber-900/30 rounded-2xl text-stone-100 shadow-2xl">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5" /> MODULAR LICENSING BUILDER
        </span>
        <h2 className="text-3xl font-bold text-stone-100 tracking-tight">
          Calculate Your Custom Business OS Package
        </h2>
        <p className="text-stone-400 mt-2 text-sm max-w-xl mx-auto">
          Start with our core Counter POS & Web Storefront. Add only the vertical modules your business needs — zero bloated software costs.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={() => setBillingPeriod('MONTHLY')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
              billingPeriod === 'MONTHLY'
                ? 'bg-amber-500 text-stone-950 font-semibold'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            Monthly Cloud Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod('ANNUAL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              billingPeriod === 'ANNUAL'
                ? 'bg-amber-500 text-stone-950 font-semibold'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            Annual Cloud Billing <span className="bg-emerald-950 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-bold">Save 15%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Module Selection List */}
        <div className="lg:col-span-7 space-y-4">
          {/* Core Card */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/10 relative">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                  REQUIRED BASE PLATFORM
                </span>
                <h3 className="font-semibold text-stone-100 text-base mt-1">Core Counter POS & Web Storefront</h3>
                <p className="text-xs text-stone-400 mt-1">
                  1 Register POS, real-time inventory pool, online web storefront, barcode checkout, & daily shift Z-reports.
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-amber-400">LKR {BASE_SETUP_LKR.toLocaleString()}</span>
                <span className="block text-[11px] text-stone-400">+ LKR {BASE_MONTHLY_LKR.toLocaleString()}/mo</span>
              </div>
            </div>
          </div>

          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 pt-2">Available Vertical Add-On Modules</h4>

          {MODULE_CATALOG.map((item) => {
            const isSelected = selectedModules.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleModule(item.id)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start justify-between gap-4 ${
                  isSelected
                    ? 'border-amber-500/50 bg-stone-800/80 shadow-md'
                    : 'border-stone-800 bg-stone-900/50 hover:border-stone-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition ${
                      isSelected ? 'bg-amber-500 text-stone-950' : 'border border-stone-600 bg-stone-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-100">{item.name}</h4>
                    <p className="text-xs text-stone-400 mt-0.5">{item.description}</p>
                    <span className="inline-block mt-2 text-[10px] text-stone-500 bg-stone-800 px-2 py-0.5 rounded">
                      Recommended: {item.recommendedFor}
                    </span>
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="text-xs font-semibold text-stone-200">+ LKR {item.setupFeeLkr.toLocaleString()}</span>
                  <span className="block text-[10px] text-stone-400">+ LKR {item.monthlyFeeLkr.toLocaleString()}/mo</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-5 sticky top-6 bg-stone-950 border border-stone-800 rounded-xl p-5 text-stone-200">
          <h3 className="text-base font-bold text-stone-100 mb-4 pb-3 border-b border-stone-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Package Investment Summary
          </h3>

          <div className="space-y-3 text-xs mb-6">
            <div className="flex justify-between text-stone-400">
              <span>Base Platform Setup</span>
              <span>LKR {BASE_SETUP_LKR.toLocaleString()}</span>
            </div>
            {selectedAddons.map((a) => (
              <div key={a.id} className="flex justify-between text-stone-300">
                <span className="truncate pr-2">• {a.name}</span>
                <span>LKR {a.setupFeeLkr.toLocaleString()}</span>
              </div>
            ))}

            <div className="pt-3 border-t border-stone-800 flex justify-between items-baseline">
              <div>
                <span className="text-sm font-bold text-stone-100">One-Time Setup Total</span>
                <p className="text-[10px] text-stone-500">Includes data migration & printer setup</p>
              </div>
              <span className="text-xl font-extrabold text-amber-400">
                LKR {totalSetupLkr.toLocaleString()}
              </span>
            </div>

            <div className="pt-3 border-t border-stone-800 flex justify-between items-baseline">
              <div>
                <span className="text-xs font-semibold text-stone-300">Monthly Cloud & Support</span>
                <p className="text-[10px] text-stone-500">{billingPeriod === 'ANNUAL' ? 'Billed annually (15% discount applied)' : 'Billed monthly'}</p>
              </div>
              <span className="text-base font-bold text-stone-100">
                LKR {finalMonthlyLkr.toLocaleString()}<span className="text-xs font-normal text-stone-400">/mo</span>
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <a
              href={`https://wa.me/94771234567?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              <MessageCircle className="w-4 h-4 fill-stone-950" /> Book 5-Min Live Tablet Demo
            </a>
            <p className="text-[10px] text-center text-stone-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Dedicated Single-Tenant Database • Zero Vendor Lock-in
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
