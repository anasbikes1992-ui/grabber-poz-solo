'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, UserCheck, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

const ROLES = [
  { id: 'OWNER', name: 'Business Owner (Super Admin)', desc: 'Full root access, general ledger, financials & settings', badge: 'ROOT' },
  { id: 'MANAGER', name: 'Store Manager', desc: 'Discounts, credit limit overrides, stock transfer approvals', badge: 'MANAGEMENT' },
  { id: 'CASHIER', name: 'Counter Cashier', desc: 'High-speed POS sales, receipt printing & cash drawer float', badge: 'POS' },
  { id: 'WAREHOUSE', name: 'Warehouse Lead', desc: 'Receiving GRNs, stock count audits & transfer dispatch', badge: 'INVENTORY' },
  { id: 'ACCOUNTANT', name: 'Senior Accountant', desc: 'Double-entry journals, VAT reconciliation & supplier AP', badge: 'FINANCE' },
  { id: 'MARKETING', name: 'Creative Producer', desc: 'AI video campaigns, store builder & social media assets', badge: 'STUDIO' },
];

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const mustRotate = search.get('rotate') === '1';
  const requestedNext = search.get('next');

  const [selectedRole, setSelectedRole] = useState(
    search.get('role') || (search.get('demo') === 'pos' ? 'CASHIER' : 'OWNER'),
  );
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const nextPath = requestedNext || (selectedRole === 'CASHIER' ? '/pos' : '/app');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mustRotate && newPin) {
        const res = await fetch('/api/auth/login', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email || undefined, currentPin: pin, newPin }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Rotation failed');
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin, role: selectedRole, email: email || undefined }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Login failed');
        if (data.mustRotateCredentials) {
          router.replace('/login?rotate=1');
          return;
        }
      }
      setIsSuccess(true);
      setTimeout(() => router.push(nextPath), 600);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      <div className="text-center space-y-3 flex flex-col items-center">
        <BrandLogo size="md" showTagline />
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
          {mustRotate ? 'Rotate Temporary PIN' : 'Staff Access Gate'}
        </h1>
        <p className="text-xs text-muted-foreground max-w-sm">
          Session cookie auth with hashed PIN. Dev demo accepts PIN 1234 without DB users.
        </p>
      </div>

      <form onSubmit={handleLogin} className="p-6 rounded-2xl glass-card glow-border-emerald space-y-5">
        {!mustRotate && (
          <fieldset className="border-0 p-0 m-0">
            <legend className="text-xs font-semibold text-foreground block mb-2">Select Active Role Profile</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Staff role">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedRole === r.id}
                  onClick={() => setSelectedRole(r.id)}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 ease-expo cursor-pointer min-h-[44px] ${
                    selectedRole === r.id
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-400 shadow-glow-em'
                      : 'border-zinc-800 hover:bg-zinc-900 text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs">{r.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800 font-semibold text-zinc-400 shrink-0">
                      {r.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{r.desc}</p>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="space-y-1.5">
          <label htmlFor="staff-email" className="text-xs font-semibold text-foreground">
            Email (optional)
          </label>
          <input
            id="staff-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@store.local"
            className="w-full px-4 py-3 text-sm rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="staff-pin" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span>{mustRotate ? 'Current PIN' : 'Staff Security PIN'}</span>
            </label>
            <button
              type="button"
              onClick={() => setPin('1234')}
              className="text-[11px] font-mono font-bold text-amber-400 hover:underline cursor-pointer"
            >
              Fill Demo PIN (1234)
            </button>
          </div>
          <input
            id="staff-pin"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter 4-digit PIN"
            maxLength={6}
            required
            className="w-full px-4 py-3 text-base rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-mono tracking-widest text-center"
          />

          {/* Quick touch numpad for counter screens */}
          <div className="grid grid-cols-3 gap-1.5 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'C') setPin('');
                  else if (k === '⌫') setPin((p) => p.slice(0, -1));
                  else setPin((p) => (p.length < 6 ? p + k : p));
                }}
                className="py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-foreground font-mono font-bold text-sm transition-colors cursor-pointer active:scale-95"
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {mustRotate && (
          <div className="space-y-1.5">
            <label htmlFor="new-pin" className="text-xs font-semibold text-foreground">
              New PIN
            </label>
            <input
              id="new-pin"
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Choose new PIN"
              maxLength={6}
              required
              className="w-full px-4 py-3 text-base rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-mono tracking-widest text-center"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs text-destructive font-medium text-center">
            {error}
          </p>
        )}

        {isSuccess ? (
          <div
            role="status"
            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center gap-2 font-bold text-xs"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Authenticated. Redirecting…</span>
          </div>
        ) : (
          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-12 py-3 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-glow-em hover:bg-emerald-400 transition-all duration-200 cursor-pointer btn-press disabled:opacity-50"
          >
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            <span>{busy ? 'Please wait…' : mustRotate ? 'Save New PIN' : 'Sign In to Terminal'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}

        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <ShieldCheck className="h-3 w-3 text-emerald-400" aria-hidden="true" />
          Bookmark this page (/adminpoz) · HttpOnly cookie opens backend at /app
        </p>
        <p className="text-[10px] text-muted-foreground text-center">
          Shopping online?{' '}
          <a href="/shop/login" className="text-emerald-400 underline underline-offset-2">
            Customer sign in
          </a>
          {' · '}
          <a href="/shop" className="text-emerald-400 underline underline-offset-2">
            Storefront
          </a>
          {' · '}
          <a href="/" className="text-emerald-400 underline underline-offset-2">
            GrabberPoz.com
          </a>
        </p>
      </form>
    </div>
  );
}
