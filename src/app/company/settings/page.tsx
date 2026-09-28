'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, ImageIcon, Save, Settings } from 'lucide-react';

type BusinessProfileForm = {
  name: string;
  legalName: string;
  taxNumber: string;
  logoUrl: string;
  receiptHeader: string;
  receiptFooter: string;
  currency: string;
  timezone: string;
};

const emptyProfile: BusinessProfileForm = {
  name: '',
  legalName: '',
  taxNumber: '',
  logoUrl: '',
  receiptHeader: '',
  receiptFooter: '',
  currency: 'LKR',
  timezone: 'Asia/Colombo',
};

export default function CompanySettingsPage() {
  const [profile, setProfile] = useState<BusinessProfileForm>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/business');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not load company settings');
      const next = data.profile || {};
      setProfile({
        name: next.name || '',
        legalName: next.legalName || '',
        taxNumber: next.taxNumber || '',
        logoUrl: next.logoUrl || '',
        receiptHeader: next.receiptHeader || '',
        receiptFooter: next.receiptFooter || '',
        currency: next.currency || 'LKR',
        timezone: next.timezone || 'Asia/Colombo',
      });
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/settings/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setMessage('Company settings saved');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/company" className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Company dashboard
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
            <Settings className="h-6 w-6 text-emerald-300" />
            Company Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Control the company profile, logo, receipt identity, and public/admin branding for this POZ instance.</p>
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
      {message && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}

      <form onSubmit={save} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-black">Profile</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Company Display Name
              <input disabled={loading} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60" />
            </label>
            <label className="block text-xs font-bold">
              Legal Name
              <input disabled={loading} value={profile.legalName} onChange={(e) => setProfile({ ...profile, legalName: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60" />
            </label>
            <label className="block text-xs font-bold">
              Tax Number
              <input disabled={loading} value={profile.taxNumber} onChange={(e) => setProfile({ ...profile, taxNumber: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60" />
            </label>
            <label className="block text-xs font-bold">
              Logo URL
              <input disabled={loading} value={profile.logoUrl} onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })} placeholder="/uploads/grabber-logo.png or https://..." className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60" />
            </label>
            <label className="block text-xs font-bold">
              Currency
              <input disabled={loading} value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60" />
            </label>
            <label className="block text-xs font-bold">
              Timezone
              <input disabled={loading} value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60" />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Receipt Header
              <textarea disabled={loading} value={profile.receiptHeader} onChange={(e) => setProfile({ ...profile, receiptHeader: e.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60" />
            </label>
            <label className="block text-xs font-bold">
              Receipt Footer
              <textarea disabled={loading} value={profile.receiptFooter} onChange={(e) => setProfile({ ...profile, receiptFooter: e.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60" />
            </label>
          </div>

          <button type="submit" disabled={saving || loading} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-black text-zinc-950 transition duration-200 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Company Settings'}
          </button>
        </section>

        <aside className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-black uppercase tracking-wide">Logo Preview</h2>
          <div className="mt-4 flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logoUrl} alt="Company logo preview" className="h-full w-full object-contain p-6" />
            ) : (
              <div className="text-center">
                <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">Add a logo URL to preview it here.</p>
              </div>
            )}
          </div>
          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
            <Building2 className="mb-2 h-4 w-4" />
            Use this for company/admin branding. Storefront-specific logo remains in Storefront CMS.
          </div>
        </aside>
      </form>
    </div>
  );
}
