'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  ShieldCheck,
  Building2,
  Warehouse,
  Receipt,
  BookOpen,
  Package,
  CreditCard,
  ShoppingBag,
  Rocket,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  KeyRound,
  AlertCircle,
} from 'lucide-react';

type Step = {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  done: boolean;
  required: boolean;
};

type OnboardingState = {
  identity: any;
  profile: any;
  steps: Step[];
  progressPercent: number;
  currentStep: number;
  isGoLiveReady: boolean;
  certifiedAt: string | null;
};

export default function OnboardingConsolePage() {
  const [data, setData] = useState<OnboardingState | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [storeName, setStoreName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [ownerPin, setOwnerPin] = useState('');

  async function loadStatus() {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding');
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.profile?.name) setStoreName(json.profile.name);
        if (json.profile?.legalName) setLegalName(json.profile.legalName);
        setActiveStep(json.currentStep || 1);
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to load onboarding status' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setActionBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_profile', name: storeName, legalName }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setMsg({ type: 'success', text: 'Business profile updated' });
        void loadStatus();
      } else {
        setMsg({ type: 'error', text: resJson.error || 'Failed to save profile' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error saving profile' });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSavePin(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerPin || ownerPin.length < 4) {
      setMsg({ type: 'error', text: 'PIN must be at least 4 digits' });
      return;
    }
    setActionBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_owner_pin', pin: ownerPin }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setMsg({ type: 'success', text: 'Owner PIN updated successfully' });
        setOwnerPin('');
        void loadStatus();
      } else {
        setMsg({ type: 'error', text: resJson.error || 'Failed to update PIN' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error updating PIN' });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleEnsureCoa() {
    setActionBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ensure_coa' }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setMsg({ type: 'success', text: 'Chart of Accounts initialized' });
        void loadStatus();
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to initialize Chart of Accounts' });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleTestTransaction() {
    setActionBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_transaction' }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setMsg({
          type: 'success',
          text: `Test transaction ${resJson.testOrderNumber} succeeded! System is now CERTIFIED FOR GO-LIVE.`,
        });
        void loadStatus();
      } else {
        setMsg({ type: 'error', text: resJson.error || 'Test transaction failed' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to run test transaction' });
    } finally {
      setActionBusy(false);
    }
  }

  const stepIcons = [
    ShieldCheck,
    Building2,
    KeyRound,
    Building2,
    Warehouse,
    Receipt,
    BookOpen,
    Package,
    CreditCard,
    ShoppingBag,
    Rocket,
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-zinc-800">
          <div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              MILESTONE 7 (M7)
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-2 flex items-center gap-3">
              Client Onboarding & Go-Live Console
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Deterministic 11-step configuration pipeline moving your VPS deployment from Unconfigured to Certified.
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-400 mb-1">Onboarding Progress</div>
            <div className="flex items-center gap-3">
              <div className="w-32 bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${data?.progressPercent || 0}%` }}
                />
              </div>
              <span className="font-mono text-sm font-bold text-emerald-400">
                {data?.progressPercent || 0}%
              </span>
            </div>
          </div>
        </div>

        {msg && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
              msg.type === 'success'
                ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/40 border border-red-800 text-red-300'
            }`}
          >
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        {/* 11-Step Stepper Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2">
          {data?.steps.map((s, idx) => {
            const Icon = stepIcons[idx] || Circle;
            const isCurrent = activeStep === s.stepNumber;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStep(s.stepNumber)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between h-20 ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
                    : s.done
                      ? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                      : 'border-zinc-900 bg-zinc-950/40 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-mono text-zinc-500 font-bold">#{s.stepNumber}</span>
                  {s.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </div>
                <div className="text-[11px] font-semibold text-zinc-200 truncate">{s.title}</div>
              </button>
            );
          })}
        </div>

        {/* Active Step Panel */}
        {loading ? (
          <div className="p-12 text-center text-zinc-500">Loading step details...</div>
        ) : (
          <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase">
                  Step {activeStep} of 11
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">
                  {data?.steps[activeStep - 1]?.title}
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  {data?.steps[activeStep - 1]?.description}
                </p>
              </div>

              {data?.steps[activeStep - 1]?.done && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Completed
                </span>
              )}
            </div>

            {/* Step 1: Installation Identity */}
            {activeStep === 1 && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500">Installation ID</div>
                    <div className="font-mono text-sm text-white font-bold mt-1">
                      {data?.identity?.installationId || 'Generating...'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500">Environment</div>
                    <div className="font-mono text-sm text-emerald-400 font-bold mt-1">
                      {data?.identity?.environment || 'STANDALONE'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500">Architecture Law</div>
                    <div className="font-mono text-xs text-zinc-300 font-bold mt-1">
                      ONE CLIENT = ONE DB = ONE INSTALL
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveStep(2)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                  >
                    Next: Business Profile <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Business Profile */}
            {activeStep === 2 && (
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-4 border-t border-zinc-800 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Store Display Name <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Colombo Style Studio"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Legal / Registered Business Name
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. Style Studio (Pvt) Ltd"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={actionBusy}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {actionBusy ? 'Saving...' : 'Save Profile & Continue'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Owner PIN */}
            {activeStep === 3 && (
              <form onSubmit={handleSavePin} className="space-y-4 pt-4 border-t border-zinc-800 max-w-md">
                <p className="text-xs text-zinc-400">
                  Set a private 4 to 6 digit security PIN for the Owner account. This replaces temporary default credentials.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    New Owner PIN (4-6 digits) <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={ownerPin}
                    onChange={(e) => setOwnerPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={actionBusy}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {actionBusy ? 'Securing...' : 'Set Owner PIN'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Branch Setup */}
            {activeStep === 4 && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-400">
                  Configure the primary physical retail store location and counter cash registers.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/settings"
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                  >
                    Manage Branches in Settings
                  </Link>
                  <button
                    onClick={() => setActiveStep(5)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Next: Central Warehouse
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Warehouse Setup */}
            {activeStep === 5 && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-400">
                  Configure central storage hubs for bulk inventory, stock receiving, and inter-location transfers.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/settings/warehouses"
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                  >
                    Configure Warehouses
                  </Link>
                  <button
                    onClick={() => setActiveStep(6)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Next: Tax Configuration
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Tax Structure */}
            {activeStep === 6 && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-400">
                  Verify the tax profile: Sri Lanka Standard VAT (18%), SVAT, or tax-exempt profile.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/settings"
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                  >
                    Review Tax Settings
                  </Link>
                  <button
                    onClick={() => setActiveStep(7)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Next: Chart of Accounts
                  </button>
                </div>
              </div>
            )}

            {/* Step 7: Chart of Accounts */}
            {activeStep === 7 && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-400">
                  Initialize double-entry ledger accounts (1010 Cash, 1020 Bank, 1100 AR, 4000 Sales Revenue).
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleEnsureCoa}
                    disabled={actionBusy}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                  >
                    {actionBusy ? 'Initializing...' : 'Initialize Default Chart of Accounts'}
                  </button>
                  <button
                    onClick={() => setActiveStep(8)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Next: Catalog
                  </button>
                </div>
              </div>
            )}

            {/* Step 8: Catalog */}
            {activeStep === 8 && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-400">
                  Ensure products and retail prices are loaded in the catalog.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/inventory"
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                  >
                    View Product Inventory
                  </Link>
                  <button
                    onClick={() => setActiveStep(9)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Next: Payments
                  </button>
                </div>
              </div>
            )}

            {/* Step 9: Payments */}
            {activeStep === 9 && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-400">
                  Supported tenders: Cash, Card, WebXPay, PayHere, Stripe, Koko, and Polim Potha customer credit.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/settings"
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                  >
                    Configure Gateway Keys
                  </Link>
                  <button
                    onClick={() => setActiveStep(10)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Next: Storefront
                  </button>
                </div>
              </div>
            )}

            {/* Step 10: Storefront */}
            {activeStep === 10 && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-400">
                  Customer ordering storefront, slide-over cart drawer, and 1-click WhatsApp order generation.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/shop"
                    target="_blank"
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                  >
                    Preview Storefront (/shop)
                  </Link>
                  <button
                    onClick={() => setActiveStep(11)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Next: Certification Gate
                  </button>
                </div>
              </div>
            )}

            {/* Step 11: Certification Gate */}
            {activeStep === 11 && (
              <div className="space-y-6 pt-4 border-t border-zinc-800">
                <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Sparkles className="w-5 h-5" /> Production Certification Gate
                  </div>
                  <p className="text-xs text-zinc-400">
                    Executing a sandbox test checkout verifies all 12 commerce invariants, stock deductions, double-entry journals, and order lifecycle states before going live.
                  </p>
                  {data?.certifiedAt ? (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono">
                      ✓ System Certified for Go-Live on {new Date(data.certifiedAt).toLocaleString()}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleTestTransaction}
                    disabled={actionBusy}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/40 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Rocket className="w-4 h-4" />
                    {actionBusy ? 'Executing Test Transaction...' : 'Run Test Transaction & Certify Go-Live'}
                  </button>
                  <Link
                    href="/pos"
                    className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold"
                  >
                    Launch POS Counter (/pos)
                  </Link>
                  <Link
                    href="/shop"
                    className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold"
                  >
                    Launch Storefront (/shop)
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
