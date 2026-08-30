'use client';

import React, { useState } from 'react';
import { BookOpen, Plus, DollarSign, Calendar, CheckCircle2, X } from 'lucide-react';

export default function PolimPothaPage() {
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [repayStatus, setRepayStatus] = useState<'IDLE' | 'SUCCESS'>('IDLE');

  const customers = [
    { id: 'c1', name: 'Sarath Perera', phone: '+94 77 123 4567', limit: 50000, balance: 11240, available: 38760, status: 'ACTIVE' },
    { id: 'c2', name: 'Chaminda Silva', phone: '+94 71 987 6543', limit: 30000, balance: 8500, available: 21500, status: 'ACTIVE' },
    { id: 'c3', name: 'Kamal Gunaratne', phone: '+94 76 555 4433', limit: 40000, balance: 0, available: 40000, status: 'ACTIVE' },
  ];

  const recentCreditEntries = [
    { id: 'e1', customer: 'Sarath Perera', type: 'REPAYMENT', amount: 10000, balanceAfter: 11240, note: 'Counter Cash Repayment', date: 'Today, 2:15 PM' },
    { id: 'e2', customer: 'Sarath Perera', type: 'INVOICE', amount: 21240, balanceAfter: 21240, note: 'Credit Sale POS-2026-1002', date: 'Today, 11:30 AM' },
    { id: 'e3', customer: 'Chaminda Silva', type: 'INVOICE', amount: 8500, balanceAfter: 8500, note: 'Credit Sale POS-2026-1005', date: 'Yesterday' },
  ];

  const handlePostRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    setRepayStatus('SUCCESS');
    setTimeout(() => {
      setIsRepayModalOpen(false);
      setRepayStatus('IDLE');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Polim Potha (Customer Credit & AR)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customer credit accounts, automated limit checks, aging analysis & double-entry repayment journal posting.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCustomer(customers[0]);
            setIsRepayModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-2 shadow-sm shadow-emerald-600/20 transition-all active:scale-95 self-start sm:self-auto"
        >
          <DollarSign className="h-3.5 w-3.5" />
          <span>Record Customer Repayment</span>
        </button>
      </div>

      {/* Aging Analysis Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">0–30 Days (Current)</p>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">LKR 19,740.00</h3>
          <p className="text-[10px] text-muted-foreground mt-1">100% of outstanding balance</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">31–60 Days</p>
          <h3 className="text-xl font-bold text-foreground mt-1">LKR 0.00</h3>
          <p className="text-[10px] text-muted-foreground mt-1">Healthy collection rate</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">61–90 Days</p>
          <h3 className="text-xl font-bold text-foreground mt-1">LKR 0.00</h3>
          <p className="text-[10px] text-muted-foreground mt-1">Zero at-risk receivables</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">90+ Days (Overdue)</p>
          <h3 className="text-xl font-bold text-foreground mt-1">LKR 0.00</h3>
          <p className="text-[10px] text-muted-foreground mt-1">Zero bad debt provisions</p>
        </div>
      </div>

      {/* Customer Accounts Overview */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-foreground">Customer Credit Accounts</h3>
          </div>
          <span className="text-xs text-muted-foreground">Active Accounts: 3</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Customer Name</th>
                <th className="pb-2.5 font-medium">Phone</th>
                <th className="pb-2.5 font-medium text-right">Credit Limit</th>
                <th className="pb-2.5 font-medium text-right">Current Balance</th>
                <th className="pb-2.5 font-medium text-right">Available Credit</th>
                <th className="pb-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3 font-semibold text-foreground">{c.name}</td>
                  <td className="py-3 text-muted-foreground">{c.phone}</td>
                  <td className="py-3 text-right font-medium text-muted-foreground">LKR {c.limit.toLocaleString()}</td>
                  <td className="py-3 text-right font-bold text-amber-600 dark:text-amber-400">LKR {c.balance.toLocaleString()}</td>
                  <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">LKR {c.available.toLocaleString()}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedCustomer(c);
                        setIsRepayModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-[11px] font-medium transition-colors"
                    >
                      Record Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Journal History */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <h3 className="font-semibold text-sm text-foreground">Recent Credit Ledger Entries</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Customer</th>
                <th className="pb-2.5 font-medium">Type</th>
                <th className="pb-2.5 font-medium text-right">Amount</th>
                <th className="pb-2.5 font-medium text-right">Balance After</th>
                <th className="pb-2.5 font-medium">Memo / Notes</th>
                <th className="pb-2.5 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recentCreditEntries.map((e) => (
                <tr key={e.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3 font-semibold text-foreground">{e.customer}</td>
                  <td className="py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      e.type === 'INVOICE' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
                    }`}>
                      {e.type}
                    </span>
                  </td>
                  <td className={`py-3 text-right font-bold ${
                    e.type === 'INVOICE' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    LKR {e.amount.toLocaleString()}
                  </td>
                  <td className="py-3 text-right font-medium text-muted-foreground">LKR {e.balanceAfter.toLocaleString()}</td>
                  <td className="py-3 text-muted-foreground">{e.note}</td>
                  <td className="py-3 text-right text-muted-foreground">{e.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Repayment Modal */}
      {isRepayModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handlePostRepayment} className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Record Customer Repayment</h3>
              <button type="button" onClick={() => setIsRepayModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 bg-secondary/50 rounded-xl border border-border/40 text-xs">
              <p className="font-semibold text-foreground">{selectedCustomer.name}</p>
              <p className="text-muted-foreground">Current Balance: LKR {selectedCustomer.balance.toLocaleString()}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Repayment Amount (LKR)</label>
                <input
                  type="number"
                  defaultValue={selectedCustomer.balance}
                  min={1}
                  max={selectedCustomer.balance}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Payment Method</label>
                <select className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground">
                  <option>Cash at Counter</option>
                  <option>Bank Transfer</option>
                  <option>Card POS</option>
                </select>
              </div>
            </div>

            {repayStatus === 'SUCCESS' ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center gap-2 font-semibold text-xs">
                <CheckCircle2 className="h-4 w-4" />
                <span>Repayment Posted & AR Journal Entry Created!</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99]"
              >
                Post Repayment & Update Ledger
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
