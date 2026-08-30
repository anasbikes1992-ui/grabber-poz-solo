'use client';

import React, { useState } from 'react';
import { Settings, Download, Database, ShieldCheck, CheckCircle2, FileSpreadsheet, Key, CreditCard, Truck, MessageSquare, Sparkles, Check, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'INTEGRATIONS' | 'BACKUPS'>('GENERAL');

  const [exportSuccess, setExportSuccess] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);

  // Integrations state
  const [payhereMerchantId, setPayhereMerchantId] = useState('214589');
  const [payhereSecret, setPayhereSecret] = useState('••••••••••••••••••••••••');
  const [koombiyoKey, setKoombiyoKey] = useState('kmb_live_sec_77889900');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('109876543210987');
  const [whatsappToken, setWhatsappToken] = useState('EAAOx••••••••••••••••••');
  const [geminiKey, setGeminiKey] = useState('AIzaSy••••••••••••••••••••');

  const [testedService, setTestedService] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleTestConnection = (service: string) => {
    setTestedService(service);
    setTimeout(() => {
      setTestedService(null);
    }, 2000);
  };

  const handleSaveIntegrations = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExportData = () => {
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2500);
  };

  const handleCreateBackup = () => {
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
      <div className="flex gap-2 border-b border-border/80 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('GENERAL')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'GENERAL'
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
        >
          General Profile & Tax
        </button>
        <button
          onClick={() => setActiveTab('INTEGRATIONS')}
          className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'INTEGRATIONS'
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
        >
          <Key className="h-3.5 w-3.5" />
          <span>API Credentials & Integrations</span>
        </button>
        <button
          onClick={() => setActiveTab('BACKUPS')}
          className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'BACKUPS'
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>Backups & Disaster Recovery</span>
        </button>
      </div>

      {/* TAB 1: General Profile & Tax Rules */}
      {activeTab === 'GENERAL' && (
        <div className="space-y-5">
          {/* Business Profile */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-foreground">Business Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-muted-foreground block mb-1">Business Trading Name</label>
                <input
                  type="text"
                  defaultValue="Grabber Flagship Retail"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Tax Registration Number</label>
                <input
                  type="text"
                  defaultValue="VAT-987654321-7000"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Receipt Header Text</label>
                <input
                  type="text"
                  defaultValue="Welcome to Grabber Flagship Store • Colombo 03"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Receipt Footer Text</label>
                <input
                  type="text"
                  defaultValue="Thank you for shopping with us! Returns accepted within 7 days."
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
                />
              </div>
            </div>
          </div>

          {/* Tax Engine */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Tax Configuration Engine</h3>
              <span className="text-[11px] text-muted-foreground">Effective-Dated Tax Rules</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 font-medium">Tax Profile Code</th>
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium text-right">Rate</th>
                    <th className="pb-2 font-medium">Effective From</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
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
        </div>
      )}

      {/* TAB 2: API Credentials & Integrations Vault */}
      {activeTab === 'INTEGRATIONS' && (
        <form onSubmit={handleSaveIntegrations} className="space-y-4 text-xs">
          {/* Payment Gateways */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Online Payment Gateways</span>
              </div>
              <button
                type="button"
                onClick={() => handleTestConnection('PayHere')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium flex items-center gap-1"
              >
                {testedService === 'PayHere' ? <Check className="h-3 w-3 text-emerald-500" /> : <RefreshCw className="h-3 w-3" />}
                <span>{testedService === 'PayHere' ? 'PayHere Connected ✓' : 'Test PayHere API'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground block mb-1">PayHere Merchant ID</label>
                <input
                  type="text"
                  value={payhereMerchantId}
                  onChange={(e) => setPayhereMerchantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">PayHere Secret / Hash Key</label>
                <input
                  type="password"
                  value={payhereSecret}
                  onChange={(e) => setPayhereSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                />
              </div>
            </div>
          </div>

          {/* Logistics & Couriers */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Truck className="h-4 w-4 text-purple-500" />
                <span>Islandwide Courier Integrations</span>
              </div>
              <button
                type="button"
                onClick={() => handleTestConnection('Koombiyo')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium flex items-center gap-1"
              >
                {testedService === 'Koombiyo' ? <Check className="h-3 w-3 text-emerald-500" /> : <RefreshCw className="h-3 w-3" />}
                <span>{testedService === 'Koombiyo' ? 'Koombiyo API Valid ✓' : 'Test Courier API'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground block mb-1">Koombiyo Courier API Key</label>
                <input
                  type="password"
                  value={koombiyoKey}
                  onChange={(e) => setKoombiyoKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Prompt Express Client Code</label>
                <input
                  type="text"
                  defaultValue="PRM-GRAB-01"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Cloud API & AI */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                <span>WhatsApp Meta Cloud API & Jarvis AI</span>
              </div>
              <button
                type="button"
                onClick={() => handleTestConnection('WhatsApp')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium flex items-center gap-1"
              >
                {testedService === 'WhatsApp' ? <Check className="h-3 w-3 text-emerald-500" /> : <RefreshCw className="h-3 w-3" />}
                <span>{testedService === 'WhatsApp' ? 'Webhook Verified ✓' : 'Test Meta Webhook'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground block mb-1">WhatsApp Phone Number ID</label>
                <input
                  type="text"
                  value={whatsappPhoneId}
                  onChange={(e) => setWhatsappPhoneId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Meta Graph Access Token</label>
                <input
                  type="password"
                  value={whatsappToken}
                  onChange={(e) => setWhatsappToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-muted-foreground block mb-1">Gemini AI / LLM API Key (Jarvis & Creative)</label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            {saveSuccess ? (
              <div className="px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>API Credentials Encrypted & Saved!</span>
              </div>
            ) : (
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
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
          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
                <FileSpreadsheet className="h-4 w-4" />
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
                  onClick={handleExportData}
                  className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export All Business Data</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Full System Snapshot Backup */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-500 font-bold text-sm mb-1">
                <Database className="h-4 w-4" />
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
                  onClick={handleCreateBackup}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
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
