'use client';

import React, { useState } from 'react';
import { Sliders, CheckCircle2, ArrowRight, Store, Layers, DollarSign, MapPin } from 'lucide-react';

const VERTICALS = [
  { id: 'FASHION', name: 'Fashion & Apparel', desc: 'Size/Color variants, barcodes, Polim Potha credit sales' },
  { id: 'GROCERY', name: 'Grocery & Supermarket', desc: 'Fast barcode scanning, unit pricing, weight integration' },
  { id: 'ELECTRONICS', name: 'Electronics & Mobile', desc: 'Serial numbers, IMEI tracking, warranty management' },
  { id: 'RESTAURANT', name: 'Restaurant & Cafe', desc: 'Table layout, KOT kitchen tickets, modifiers & recipes' },
  { id: 'SERVICES', name: 'Salon & Services', desc: 'Appointments, staff commission, service durations' },
  { id: 'WHOLESALE', name: 'Wholesale & B2B', desc: 'Bulk tiered pricing, supplier payables, high credit limits' },
];

export default function SetupWizardPage() {
  const [selectedVertical, setSelectedVertical] = useState('FASHION');
  const [step, setStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      {/* Wizard Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Business Setup Wizard</h2>
        <p className="text-xs text-muted-foreground">
          Configure your Single-Business OS in less than 2 minutes.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-center items-center gap-2 text-xs font-semibold">
        <span className={`px-3 py-1 rounded-full ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
          1. Industry Vertical
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className={`px-3 py-1 rounded-full ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
          2. Locations & Tenders
        </span>
      </div>

      {step === 1 ? (
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-foreground">Select your primary industry vertical</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VERTICALS.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVertical(v.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedVertical === v.id
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border hover:bg-secondary text-foreground'
                }`}
              >
                <h4 className="font-bold text-xs">{v.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{v.desc}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full mt-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
          >
            <span>Continue to Locations Setup</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-sm text-foreground">Store Details & Physical Locations</h3>

          <div className="space-y-3">
            <div>
              <label className="text-muted-foreground block mb-1">Business Trading Name</label>
              <input
                type="text"
                defaultValue="Grabber Flagship Retail"
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground block mb-1">Operating Currency</label>
                <input
                  type="text"
                  defaultValue="LKR (Sri Lankan Rupee)"
                  readOnly
                  className="w-full px-3 py-2 rounded-xl bg-secondary/60 border border-border text-muted-foreground font-medium"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Initial VAT Rate</label>
                <input
                  type="text"
                  defaultValue="18.00% (Effective from Jan 1)"
                  readOnly
                  className="w-full px-3 py-2 rounded-xl bg-secondary/60 border border-border text-muted-foreground font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-muted-foreground block mb-1">Primary Physical Locations</label>
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-secondary/60 border border-border flex items-center justify-between">
                  <span className="font-semibold text-foreground">Colombo Main Branch (Retail POS Counter)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold">BRANCH</span>
                </div>
                <div className="p-2.5 rounded-xl bg-secondary/60 border border-border flex items-center justify-between">
                  <span className="font-semibold text-foreground">Central Colombo Warehouse (Bulk Depot)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 font-bold">WAREHOUSE</span>
                </div>
              </div>
            </div>
          </div>

          {isCompleted ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center gap-2 font-bold text-xs">
              <CheckCircle2 className="h-4 w-4" />
              <span>Business OS Configured & Ready!</span>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(1)}
                className="py-2.5 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs"
              >
                Back
              </button>
              <button
                onClick={() => setIsCompleted(true)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99]"
              >
                Launch Business OS
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
