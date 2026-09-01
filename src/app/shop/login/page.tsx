'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { BrandLogo } from '@/components/ui/brand-logo';

function ShopLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/shopper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'login'
            ? { action: 'login', phone: phone || undefined, email: email || undefined, password }
            : { action: 'register', name, phone: phone || undefined, email: email || undefined, password },
        ),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      router.push(next.startsWith('/') ? next : '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_55%)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/85 p-8 shadow-xl shadow-emerald-900/10 backdrop-blur">
        <Link href="/" className="inline-flex">
          <BrandLogo size="lg" showTagline={false} showSoloBadge={false} />
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold text-slate-900">
          {mode === 'login' ? 'Customer sign in' : 'Create shopper account'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Shop online at the storefront.
        </p>

        <div className="mt-4 flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-full px-3 py-1.5 ${mode === 'login' ? 'bg-emerald-700 text-white' : 'bg-slate-100'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`rounded-full px-3 py-1.5 ${mode === 'register' ? 'bg-emerald-700 text-white' : 'bg-slate-100'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Full name</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5"
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Email {mode === 'login' ? '(or phone)' : '(optional)'}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Password</span>
            <input
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5"
            />
          </label>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-emerald-700 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-emerald-800 hover:underline">
            Back to store
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ShopLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <ShopLoginForm />
    </Suspense>
  );
}
