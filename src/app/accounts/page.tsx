'use client';

import React, { useState } from 'react';
import { DollarSign, BookOpen, TrendingUp, CheckCircle2, ShieldCheck, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState<'PL' | 'COA' | 'JOURNALS'>('PL');

  const chartOfAccounts = [
    { code: '1010', name: 'Cash on Hand (Till / Drawer)', type: 'ASSET', balance: 42500.0, nature: 'DEBIT' },
    { code: '1020', name: 'Bank Account (PayHere / Terminal)', type: 'ASSET', balance: 85930.0, nature: 'DEBIT' },
    { code: '1090', name: 'Sales Clearing Account', type: 'ASSET', balance: 0.0, nature: 'ZERO_CLEARED' },
    { code: '1100', name: 'Accounts Receivable (Polim Potha)', type: 'ASSET', balance: 11240.0, nature: 'DEBIT' },
    { code: '1200', name: 'Merchandise Inventory Asset', type: 'ASSET', balance: 190000.0, nature: 'DEBIT' },
    { code: '2000', name: 'Accounts Payable (Suppliers)', type: 'LIABILITY', balance: 250000.0, nature: 'CREDIT' },
    { code: '2100', name: 'VAT Payable (18%)', type: 'LIABILITY', balance: 8640.0, nature: 'CREDIT' },
    { code: '4000', name: 'Sales Revenue (Gross)', type: 'REVENUE', balance: 71030.0, nature: 'CREDIT' },
    { code: '5000', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', balance: 39500.0, nature: 'DEBIT' },
  ];

  const recentJournals = [
    { id: 'JE-1001', entryNumber: 'JE-INV-POS-2026-1001', date: 'Today, 2:10 PM', memo: 'POS Sale Invoice #1001', debits: '10,620.00 (1090)', credits: '9,000.00 (4000) + 1,620.00 (2100)' },
    { id: 'JE-1002', entryNumber: 'JE-PAY-POS-2026-1001-0', date: 'Today, 2:10 PM', memo: 'Tender: Cash 5,000.00', debits: '5,000.00 (1010)', credits: '5,000.00 (1090)' },
    { id: 'JE-1003', entryNumber: 'JE-PAY-POS-2026-1001-1', date: 'Today, 2:10 PM', memo: 'Tender: Card 5,620.00', debits: '5,620.00 (1020)', credits: '5,620.00 (1090)' },
    { id: 'JE-1004', entryNumber: 'JE-GRN-PO-2026-001', date: 'Today, 11:00 AM', memo: 'Goods Receipt 100x Shirts', debits: '250,000.00 (1200)', credits: '250,000.00 (2000)' },
  ];

  // Financial calculations
  const grossRevenue = 71030.0;
  const cogs = 39500.0;
  const grossProfit = grossRevenue - cogs;
  const operatingExpenses = 4200.0;
  const netProfit = grossProfit - operatingExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>General Ledger & Financial Accounts</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
              Double-Entry Invariant: Δ = 0.00
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Chart of Accounts, Profit & Loss Statement, and immutable double-entry journal postings.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('PL')}
            className={`px-3 py-1.5 min-h-11 rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'PL' ? 'bg-emerald-500 text-zinc-950 shadow-glow-em' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Profit & Loss
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COA')}
            className={`px-3 py-1.5 min-h-11 rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'COA' ? 'bg-emerald-500 text-zinc-950 shadow-glow-em' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Chart of Accounts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('JOURNALS')}
            className={`px-3 py-1.5 min-h-11 rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'JOURNALS' ? 'bg-emerald-500 text-zinc-950 shadow-glow-em' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Journal Entries
          </button>
        </div>
      </div>

      {activeTab === 'PL' ? (
        <div className="space-y-6">
          {/* P&L Statement */}
          <div className="p-6 rounded-2xl glass-card space-y-4 max-w-2xl">
            <h3 className="font-bold text-sm text-foreground">Income Statement (Profit & Loss)</h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-zinc-800">
                <span className="font-semibold text-foreground">Sales Revenue (Net of VAT)</span>
                <span className="font-bold text-foreground">LKR {grossRevenue.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-border/60 text-muted-foreground">
                <span>Less: Cost of Goods Sold (COGS)</span>
                <span className="text-destructive font-medium">- LKR {cogs.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-border/60 font-bold text-foreground">
                <span>Gross Profit Margin (44.4%)</span>
                <span className="text-emerald-600 dark:text-emerald-400">LKR {grossProfit.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-border/60 text-muted-foreground">
                <span>Less: Store Operating Expenses & Packaging</span>
                <span className="text-destructive font-medium">- LKR {operatingExpenses.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-3 pt-4 border-t-2 border-emerald-500/30 font-extrabold text-sm text-foreground">
                <span>Net Operating Profit</span>
                <span className="text-emerald-400 text-base tabular-nums">LKR {netProfit.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'COA' ? (
        /* Chart of Accounts */
        <div className="p-5 rounded-2xl glass-card space-y-4">
          <h3 className="font-semibold text-sm text-foreground">Chart of Accounts (COA)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-muted-foreground">
                  <th className="pb-2.5 font-medium">Account Code</th>
                  <th className="pb-2.5 font-medium">Account Name</th>
                  <th className="pb-2.5 font-medium">Category Type</th>
                  <th className="pb-2.5 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {chartOfAccounts.map((a) => (
                  <tr key={a.code} className="hover:bg-zinc-900/60 transition-colors duration-200">
                    <td className="py-3 font-mono font-bold text-foreground">{a.code}</td>
                    <td className="py-3 font-medium text-foreground">{a.name}</td>
                    <td className="py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-secondary font-semibold text-muted-foreground">
                        {a.type}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-foreground">LKR {a.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Journal Entries Explorer */
        <div className="p-5 rounded-2xl glass-card space-y-4">
          <h3 className="font-semibold text-sm text-foreground">Double-Entry Journal Postings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-muted-foreground">
                  <th className="pb-2.5 font-medium">Entry Number</th>
                  <th className="pb-2.5 font-medium">Date & Memo</th>
                  <th className="pb-2.5 font-medium">Debits (Dr)</th>
                  <th className="pb-2.5 font-medium">Credits (Cr)</th>
                  <th className="pb-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {recentJournals.map((j) => (
                  <tr key={j.id} className="hover:bg-zinc-900/60 transition-colors duration-200">
                    <td className="py-3 font-mono font-semibold text-foreground">{j.entryNumber}</td>
                    <td className="py-3">
                      <p className="font-medium text-foreground">{j.memo}</p>
                      <p className="text-[10px] text-muted-foreground">{j.date}</p>
                    </td>
                    <td className="py-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{j.debits}</td>
                    <td className="py-3 font-mono text-blue-600 dark:text-blue-400 font-semibold">{j.credits}</td>
                    <td className="py-3 text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                        BALANCED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
