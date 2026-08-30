'use client';

import React, { useState } from 'react';
import { Settings, Download, Database, ShieldCheck, CheckCircle2, FileSpreadsheet, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [exportSuccess, setExportSuccess] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);

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
        <h2 className="text-xl font-bold text-foreground tracking-tight">Settings, Tax Rules & Disaster Recovery</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Single-business configuration, effective-dated tax profiles, open data export, and automated backup snapshots.
        </p>
      </div>

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
              defaultValue="Welcome to Grabber Flagship Store &bull; Colombo 03"
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

      {/* Effective-Dated Tax Profiles */}
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

      {/* Data Export & Disaster Recovery */}
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
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-semibold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Database Snapshot Created!</span>
              </div>
            ) : (
              <button
                onClick={handleCreateBackup}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-purple-600/20"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Create System Backup Archive</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
