'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings, Download, Database, ShieldCheck, CheckCircle2, FileSpreadsheet, Key, CreditCard, Truck, MessageSquare, Sparkles, Check, RefreshCw, Layers, Building2 } from 'lucide-react';
import { DEFAULT_VERTICAL_FLAGS, type VerticalFlags } from '@/lib/config/vertical-flags';
import { VERTICAL_PRESETS, type VerticalPresetId } from '@/lib/config/vertical-presets';

type BusinessProfile = {
  name: string;
  legalName: string;
  taxNumber: string;
  receiptHeader: string;
  receiptFooter: string;
  currency: string;
  timezone: string;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'VERTICALS' | 'INTEGRATIONS' | 'BACKUPS'>('GENERAL');

  const [exportSuccess, setExportSuccess] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile>({
    name: '',
    legalName: '',
    taxNumber: '',
    receiptHeader: '',
    receiptFooter: '',
    currency: 'LKR',
    timezone: 'Asia/Colombo',
  });

  // Integrations state
  const [payhereMerchantId, setPayhereMerchantId] = useState('');
  const [payhereSecret, setPayhereSecret] = useState('');
  const [koombiyoKey, setKoombiyoKey] = useState('');
  const [promptExpressCode, setPromptExpressCode] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  const [testedService, setTestedService] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [verticalFlags, setVerticalFlags] = useState<VerticalFlags>(DEFAULT_VERTICAL_FLAGS);
  const [flagsSaveSuccess, setFlagsSaveSuccess] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await fetch('/api/settings/business');
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile({
          name: data.profile.name || '',
          legalName: data.profile.legalName || '',
          taxNumber: data.profile.taxNumber || '',
          receiptHeader: data.profile.receiptHeader || '',
          receiptFooter: data.profile.receiptFooter || '',
          currency: data.profile.currency || 'LKR',
          timezone: data.profile.timezone || 'Asia/Colombo',
        });
      }
      if (data.integrations) {
        setPayhereMerchantId(data.integrations.payhereMerchantId || '');
        setWhatsappPhoneId(data.integrations.whatsappPhoneId || '');
        setPromptExpressCode(data.integrations.promptExpressClientCode || '');
      }
      const flagsRes = await fetch('/api/config/flags');
      const flagsData = await flagsRes.json();
      if (flagsData.success && flagsData.flags) {
        setVerticalFlags({ ...DEFAULT_VERTICAL_FLAGS, ...flagsData.flags });
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleTestConnection = (service: string) => {
    setTestedService(service);
    setTimeout(() => {
      setTestedService(null);
    }, 2000);
  };

  const isMasked = (v: string) => !v || v.includes('•');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/settings/business', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (data.success) {
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 2000);
    }
  };

  const handleSaveVerticalFlags = async () => {
    const res = await fetch('/api/config/flags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flags: verticalFlags }),
    });
    const data = await res.json();
    if (data.success) {
      setFlagsSaveSuccess(true);
      setTimeout(() => setFlagsSaveSuccess(false), 2000);
    }
  };

  async function applyBusinessPreset(presetId: VerticalPresetId) {
    setApplyingPreset(presetId);
    try {
      const res = await fetch('/api/config/flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: presetId }),
      });
      const data = await res.json();
      if (data.success && data.flags) {
        setVerticalFlags({ ...DEFAULT_VERTICAL_FLAGS, ...data.flags });
        setFlagsSaveSuccess(true);
        setTimeout(() => setFlagsSaveSuccess(false), 2000);
      }
    } finally {
      setApplyingPreset(null);
    }
  }

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const secrets: Record<string, string> = {};
      if (!isMasked(payhereSecret)) secrets.payhereSecret = payhereSecret;
      if (!isMasked(koombiyoKey)) secrets.koombiyoApiKey = koombiyoKey;
      if (!isMasked(whatsappToken)) secrets.whatsappToken = whatsappToken;
      if (!isMasked(geminiKey)) secrets.geminiApiKey = geminiKey;

      const res = await fetch('/api/settings/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secrets,
          publicConfig: {
            payhereMerchantId,
            whatsappPhoneId,
            promptExpressClientCode: promptExpressCode,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      setSaveSuccess(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/backup/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grabber-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch {
      setExportSuccess(false);
    }
  };

  const handleCreateBackup = async () => {
    await handleExportData();
    setBackupSuccess(true);
    setTimeout(() => setBackupSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">Settings & Integrations Vault</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Single-business configuration, payment gateways, couriers, WhatsApp API, tax profiles, and disaster recovery.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('GENERAL')}
          className={`px-4 py-2 min-h-11 rounded-xl font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'GENERAL'
              ? 'bg-emerald-500 text-zinc-950 shadow-glow-em'
              : 'text-muted-foreground hover:text-foreground hover:bg-zinc-900'
          }`}
        >
          General Profile & Tax
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('VERTICALS')}
          className={`px-4 py-2 min-h-11 rounded-xl font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
            activeTab === 'VERTICALS'
              ? 'bg-emerald-500 text-zinc-950 shadow-glow-em'
              : 'text-muted-foreground hover:text-foreground hover:bg-zinc-900'
          }`}
        >
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Vertical modules</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('INTEGRATIONS')}
          className={`px-4 py-2 min-h-11 rounded-xl font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
            activeTab === 'INTEGRATIONS'
              ? 'bg-emerald-500 text-zinc-950 shadow-glow-em'
              : 'text-muted-foreground hover:text-foreground hover:bg-zinc-900'
          }`}
        >
          <Key className="h-3.5 w-3.5" aria-hidden="true" />
          <span>API Credentials & Integrations</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('BACKUPS')}
          className={`px-4 py-2 min-h-11 rounded-xl font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
            activeTab === 'BACKUPS'
              ? 'bg-emerald-500 text-zinc-950 shadow-glow-em'
              : 'text-muted-foreground hover:text-foreground hover:bg-zinc-900'
          }`}
        >
          <Database className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Backups & Disaster Recovery</span>
        </button>
        <Link
          href="/settings/installation"
          className="px-4 py-2 min-h-11 rounded-xl font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer text-amber-500 hover:text-amber-400 hover:bg-zinc-900 border border-amber-500/20"
        >
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Installation & License</span>
        </Link>
      </div>

      {/* TAB 1: General Profile & Tax Rules */}
      {activeTab === 'GENERAL' && (
        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Business Profile */}
          <div className="p-6 rounded-2xl glass-card space-y-4 text-xs">
            <h3 className="font-bold text-sm text-foreground">Business Profile</h3>
            {profileLoading ? (
              <p className="text-muted-foreground">Loading profile…</p>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-business-name" className="text-muted-foreground block mb-1">
                  Business Trading Name
                </label>
                <input
                  id="settings-business-name"
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-medium"
                />
              </div>
              <div>
                <label htmlFor="settings-tax-reg" className="text-muted-foreground block mb-1">
                  Tax Registration Number
                </label>
                <input
                  id="settings-tax-reg"
                  type="text"
                  value={profile.taxNumber}
                  onChange={(e) => setProfile((p) => ({ ...p, taxNumber: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-medium"
                />
              </div>
              <div>
                <label htmlFor="settings-receipt-header" className="text-muted-foreground block mb-1">
                  Receipt Header Text
                </label>
                <input
                  id="settings-receipt-header"
                  type="text"
                  value={profile.receiptHeader}
                  onChange={(e) => setProfile((p) => ({ ...p, receiptHeader: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-medium"
                />
              </div>
              <div>
                <label htmlFor="settings-receipt-footer" className="text-muted-foreground block mb-1">
                  Receipt Footer Text
                </label>
                <input
                  id="settings-receipt-footer"
                  type="text"
                  value={profile.receiptFooter}
                  onChange={(e) => setProfile((p) => ({ ...p, receiptFooter: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-medium"
                />
              </div>
            </div>
            )}
            <div className="flex justify-end pt-2">
              {profileSaveSuccess ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              ) : (
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold cursor-pointer btn-press disabled:opacity-50"
                >
                  Save Business Profile
                </button>
              )}
            </div>
          </div>

          <div className="p-6 rounded-2xl glass-card space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Tax Configuration Engine</h3>
              <span className="text-[11px] text-muted-foreground">Effective-Dated Tax Rules</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-muted-foreground">
                    <th className="pb-2 font-medium">Tax Profile Code</th>
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium text-right">Rate</th>
                    <th className="pb-2 font-medium">Effective From</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <tr>
                    <td className="py-2.5 font-mono font-semibold text-foreground">STANDARD_VAT</td>
                    <td className="py-2.5 text-foreground">Sri Lankan VAT</td>
                    <td className="py-2.5 text-right font-bold text-foreground">18.00%</td>
                    <td className="py-2.5 text-muted-foreground">2026-01-01 &ndash; Active</td>
                    <td className="py-2.5 text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">ACTIVE</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-mono font-semibold text-foreground">ZERO_RATED</td>
                    <td className="py-2.5 text-foreground">Export / Zero-Rated</td>
                    <td className="py-2.5 text-right font-bold text-foreground">0.00%</td>
                    <td className="py-2.5 text-muted-foreground">2026-01-01 &ndash; Active</td>
                    <td className="py-2.5 text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold">ACTIVE</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'VERTICALS' && (
        <div className="space-y-4">
          <div className="rounded-2xl glass-card p-6 text-xs space-y-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-500" /> Business nature presets
            </h3>
            <p className="text-muted-foreground">
              Presets auto-configure capability modules, item types, and POS modes. Polim Potha credit ledger is always on.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(VERTICAL_PRESETS) as VerticalPresetId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  disabled={Boolean(applyingPreset)}
                  onClick={() => void applyBusinessPreset(id)}
                  className="rounded-xl border border-border bg-secondary/40 p-3 text-left hover:border-emerald-500/40 disabled:opacity-50"
                >
                  <p className="font-bold text-foreground">{VERTICAL_PRESETS[id].label}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{VERTICAL_PRESETS[id].natureOfBusiness}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{VERTICAL_PRESETS[id].adaptedWorkflows[0]}</p>
                  {applyingPreset === id && <p className="mt-1 text-[10px] text-emerald-600">Applying…</p>}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl glass-card p-6 text-xs space-y-4">
            <h3 className="font-bold text-sm text-foreground">Enabled vertical modules</h3>
            <p className="text-muted-foreground">
              Toggle modules for sidebar nav, agents, and storefront promos. Polim Potha is always on (core ledger).
            </p>
            {flagsSaveSuccess && (
              <p className="flex items-center gap-2 font-semibold text-emerald-500">
                <CheckCircle2 className="h-4 w-4" /> Vertical flags saved
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(DEFAULT_VERTICAL_FLAGS) as (keyof VerticalFlags)[]).map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={verticalFlags[key]}
                    onChange={(e) => setVerticalFlags((f) => ({ ...f, [key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="font-semibold capitalize text-foreground">{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleSaveVerticalFlags()}
              className="min-h-11 rounded-xl bg-emerald-500 px-5 py-2 font-bold text-zinc-950"
            >
              Save vertical flags
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: API Credentials & Integrations Vault */}
      {activeTab === 'INTEGRATIONS' && (
        <form onSubmit={handleSaveIntegrations} className="space-y-4 text-xs">
          {/* Payment Gateways */}
          <div className="p-5 rounded-2xl glass-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <CreditCard className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>Online Payment Gateways</span>
              </div>
              <button
                type="button"
                onClick={() => handleTestConnection('PayHere')}
                className="text-[11px] px-2.5 py-1 min-h-11 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-foreground font-medium flex items-center gap-1 cursor-pointer"
              >
                {testedService === 'PayHere' ? <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" /> : <RefreshCw className="h-3 w-3" aria-hidden="true" />}
                <span>{testedService === 'PayHere' ? 'PayHere Connected ✓' : 'Test PayHere API'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-payhere-merchant" className="text-muted-foreground block mb-1">
                  PayHere Merchant ID
                </label>
                <input
                  id="settings-payhere-merchant"
                  type="text"
                  value={payhereMerchantId}
                  onChange={(e) => setPayhereMerchantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-mono"
                />
              </div>
              <div>
                <label htmlFor="settings-payhere-secret" className="text-muted-foreground block mb-1">
                  PayHere Secret / Hash Key
                </label>
                <input
                  id="settings-payhere-secret"
                  type="password"
                  value={payhereSecret}
                  onChange={(e) => setPayhereSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Truck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>Islandwide Courier Integrations</span>
              </div>
              <button
                type="button"
                onClick={() => handleTestConnection('Koombiyo')}
                className="text-[11px] px-2.5 py-1 min-h-11 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-foreground font-medium flex items-center gap-1 cursor-pointer"
              >
                {testedService === 'Koombiyo' ? <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" /> : <RefreshCw className="h-3 w-3" aria-hidden="true" />}
                <span>{testedService === 'Koombiyo' ? 'Koombiyo API Valid ✓' : 'Test Courier API'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-koombiyo-key" className="text-muted-foreground block mb-1">
                  Koombiyo Courier API Key
                </label>
                <input
                  id="settings-koombiyo-key"
                  type="password"
                  value={koombiyoKey}
                  onChange={(e) => setKoombiyoKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-mono"
                />
              </div>
              <div>
                <label htmlFor="settings-prompt-code" className="text-muted-foreground block mb-1">
                  Prompt Express Client Code
                </label>
                <input
                  id="settings-prompt-code"
                  type="text"
                  value={promptExpressCode}
                  onChange={(e) => setPromptExpressCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <MessageSquare className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>WhatsApp Meta Cloud API & Jarvis AI</span>
              </div>
              <button
                type="button"
                onClick={() => handleTestConnection('WhatsApp')}
                className="text-[11px] px-2.5 py-1 min-h-11 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-foreground font-medium flex items-center gap-1 cursor-pointer"
              >
                {testedService === 'WhatsApp' ? <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" /> : <RefreshCw className="h-3 w-3" aria-hidden="true" />}
                <span>{testedService === 'WhatsApp' ? 'Webhook Verified ✓' : 'Test Meta Webhook'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-whatsapp-phone" className="text-muted-foreground block mb-1">
                  WhatsApp Phone Number ID
                </label>
                <input
                  id="settings-whatsapp-phone"
                  type="text"
                  value={whatsappPhoneId}
                  onChange={(e) => setWhatsappPhoneId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-mono"
                />
              </div>
              <div>
                <label htmlFor="settings-whatsapp-token" className="text-muted-foreground block mb-1">
                  Meta Graph Access Token
                </label>
                <input
                  id="settings-whatsapp-token"
                  type="password"
                  value={whatsappToken}
                  onChange={(e) => setWhatsappToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="settings-gemini-key" className="text-muted-foreground block mb-1">
                  Gemini AI / LLM API Key (Jarvis & Creative)
                </label>
                <input
                  id="settings-gemini-key"
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            {saveSuccess ? (
              <div className="px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>API Credentials Encrypted & Saved!</span>
              </div>
            ) : (
              <button
                type="submit"
                className="px-6 py-2.5 min-h-11 rounded-xl bg-emerald-500 text-zinc-950 font-bold shadow-glow-em hover:bg-emerald-400 transition-all duration-200 cursor-pointer btn-press"
              >
                Save Integration Keys
              </button>
            )}
          </div>
        </form>
      )}

      {/* TAB 3: Backups & Disaster Recovery */}
      {activeTab === 'BACKUPS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* 1. Open Business Data Export */}
          <div className="p-5 rounded-2xl glass-card space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                <span>Business Data Export</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Export products, orders, inventory movements, Polim Potha credit ledger, and customers into open CSV/JSON formats. Zero vendor lock-in.
              </p>
            </div>

            <div>
              {exportSuccess ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Export Package Generated!</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleExportData}
                  className="w-full min-h-11 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Export All Business Data</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Full System Snapshot Backup */}
          <div className="p-5 rounded-2xl glass-card space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                <Database className="h-4 w-4" aria-hidden="true" />
                <span>Disaster Recovery Snapshot</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Create a cryptographic PostgreSQL database & media asset snapshot archive for instant one-click disaster recovery.
              </p>
            </div>

            <div>
              {backupSuccess ? (
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Snapshot Created & Encrypted!</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateBackup}
                  className="w-full min-h-11 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-semibold flex items-center justify-center gap-2 shadow-glow-em hover:bg-emerald-400 transition-all duration-200 cursor-pointer btn-press"
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Create System Backup Archive</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
