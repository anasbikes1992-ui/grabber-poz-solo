'use client';

import React, { useState } from 'react';
import { Lock, ShieldCheck, UserCheck, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';

const ROLES = [
  { id: 'OWNER', name: 'Business Owner (Super Admin)', desc: 'Full root access, general ledger, financials & settings', badge: 'ROOT' },
  { id: 'MANAGER', name: 'Store Manager', desc: 'Discounts, credit limit overrides, stock transfer approvals', badge: 'MANAGEMENT' },
  { id: 'CASHIER', name: 'Counter Cashier', desc: 'High-speed POS sales, receipt printing & cash drawer float', badge: 'POS' },
  { id: 'WAREHOUSE', name: 'Warehouse Lead', desc: 'Receiving GRNs, stock count audits & transfer dispatch', badge: 'INVENTORY' },
  { id: 'ACCOUNTANT', name: 'Senior Accountant', desc: 'Double-entry journals, VAT reconciliation & supplier AP', badge: 'FINANCE' },
  { id: 'MARKETING', name: 'Creative Producer', desc: 'AI video campaigns, store builder & social media assets', badge: 'STUDIO' },
];

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState('OWNER');
  const [pin, setPin] = useState('1234');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/25">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Super Admin & Staff Access</h2>
        <p className="text-xs text-muted-foreground">
          Single-business role-based security with local session caching and PIN authentication.
        </p>
      </div>

      {/* Role Selection Grid */}
      <form onSubmit={handleLogin} className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-5">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-2">Select Active Role Profile</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRole(r.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedRole === r.id
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border hover:bg-secondary text-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs">{r.name}</h4>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary font-semibold text-muted-foreground">
                    {r.badge}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* PIN Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Staff Security PIN</span>
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter 4-digit PIN"
            maxLength={6}
            className="w-full px-4 py-2.5 text-sm rounded-xl bg-secondary border border-border text-foreground font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[10px] text-muted-foreground text-center">Demo PIN: 1234</p>
        </div>

        {/* Submit */}
        {isSuccess ? (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center gap-2 font-bold text-xs">
            <CheckCircle2 className="h-4 w-4" />
            <span>Authenticated as {selectedRole}! Redirecting...</span>
          </div>
        ) : (
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
          >
            <UserCheck className="h-4 w-4" />
            <span>Sign In to Terminal</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </form>
    </div>
  );
}
