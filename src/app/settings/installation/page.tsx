'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Save,
  ArrowLeft,
  Server,
  Receipt,
  Globe,
} from 'lucide-react';
import type { InstallationIdentity } from '@/lib/installation/types';
import type { InstallationDiagnosticReport } from '@/lib/installation/diagnostics';

export default function InstallationSettingsPage() {
  const [identity, setIdentity] = useState<InstallationIdentity | null>(null);
  const [diagnostics, setDiagnostics] = useState<InstallationDiagnosticReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/installation');
      const data = await res.json();
      if (data.success) {
        setIdentity(data.identity);
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to load installation settings' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!identity) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings/installation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identity),
      });
      const data = await res.json();
      if (data.success) {
        setIdentity(data.identity);
        setStatusMsg({ type: 'success', text: 'Installation configuration saved successfully!' });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to save changes' });
      }
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function runDiagnostics() {
    setDiagLoading(true);
    try {
      const res = await fetch('/api/installation/diagnostics');
      const data = await res.json();
      if (data.success) {
        setDiagnostics(data.report);
      }
    } catch {
      /* ignore */
    } finally {
      setDiagLoading(false);
    }
  }

  const copyInstallationId = () => {
    if (!identity?.installationId) return;
    navigator.clipboard.writeText(identity.installationId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading || !identity) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-amber-500 mr-2" />
        <span>Loading Installation Identity...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Settings</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-amber-500" />
            <span>Installation Identity & Whitelabel</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Canonical single-business identity, tax profile, and standalone license status.
          </p>
        </div>

        <button
          onClick={runDiagnostics}
          disabled={diagLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
        >
          <Server className={`w-4 h-4 ${diagLoading ? 'animate-spin text-amber-500' : 'text-slate-400'}`} />
          <span>{diagLoading ? 'Running Checks...' : 'Run Diagnostics'}</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Diagnostics Panel (if run) */}
      {diagnostics && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-base">Installation Health & Diagnostic Report</h2>
            </div>
            <span
              className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                diagnostics.overallStatus === 'HEALTHY'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : diagnostics.overallStatus === 'DEGRADED'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {diagnostics.overallStatus}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {diagnostics.checks.map((c) => (
              <div
                key={c.id}
                className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 flex items-start gap-3"
              >
                {c.status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                {c.status === 'WARN' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                {c.status === 'FAIL' && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                <div>
                  <div className="text-xs font-bold text-slate-200">{c.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{c.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* License & Installation Identification */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Standalone License Identity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Installation UUID
              </label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono">
                <span className="truncate flex-1 text-slate-700 dark:text-slate-300">
                  {identity.installationId}
                </span>
                <button
                  type="button"
                  onClick={copyInstallationId}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  title="Copy Installation UUID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                License Key / ID
              </label>
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 truncate">
                {identity.license?.licenseId || 'LIC-POZ-STANDALONE'}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Edition & Status
              </label>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg text-xs font-bold uppercase">
                  {identity.license?.edition || 'STANDARD'}
                </span>
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs font-bold uppercase">
                  {identity.license?.status || 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Business Identity & Profile */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Business Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Business Operating Name *
              </label>
              <input
                type="text"
                required
                value={identity.businessName}
                onChange={(e) => setIdentity({ ...identity, businessName: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                placeholder="ABC Fashion"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Legal Entity Name (Invoices / Receipts) *
              </label>
              <input
                type="text"
                required
                value={identity.legalName}
                onChange={(e) => setIdentity({ ...identity, legalName: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                placeholder="ABC Fashion (Pvt) Ltd"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Primary Contact Phone *
              </label>
              <input
                type="text"
                required
                value={identity.phone}
                onChange={(e) => setIdentity({ ...identity, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white font-mono"
                placeholder="0112345678"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Primary Contact Email *
              </label>
              <input
                type="email"
                required
                value={identity.email}
                onChange={(e) => setIdentity({ ...identity, email: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                placeholder="contact@abcfashion.lk"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Physical Address (Line 1)
              </label>
              <input
                type="text"
                value={identity.address.line1}
                onChange={(e) =>
                  setIdentity({
                    ...identity,
                    address: { ...identity.address, line1: e.target.value },
                  })
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                placeholder="No 45 Galle Road"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                City
              </label>
              <input
                type="text"
                value={identity.address.city}
                onChange={(e) =>
                  setIdentity({
                    ...identity,
                    address: { ...identity.address, city: e.target.value },
                  })
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                placeholder="Colombo 03"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Country
              </label>
              <input
                type="text"
                value={identity.address.country}
                onChange={(e) =>
                  setIdentity({
                    ...identity,
                    address: { ...identity.address, country: e.target.value },
                  })
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                placeholder="Sri Lanka"
              />
            </div>
          </div>
        </div>

        {/* Tax Profile */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Receipt className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Tax Identity (VAT / TIN)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                VAT / TIN Registration Number
              </label>
              <input
                type="text"
                value={identity.tax.taxRegistrationNumber || ''}
                onChange={(e) =>
                  setIdentity({
                    ...identity,
                    tax: { ...identity.tax, taxRegistrationNumber: e.target.value },
                  })
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white font-mono uppercase"
                placeholder="VAT-123456789"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Default Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={(identity.tax.defaultTaxRate * 100).toFixed(0)}
                onChange={(e) =>
                  setIdentity({
                    ...identity,
                    tax: { ...identity.tax, defaultTaxRate: Number(e.target.value) / 100 },
                  })
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white font-mono"
                placeholder="18"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Installation Identity'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
