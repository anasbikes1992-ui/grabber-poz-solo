'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Share2, Save, ArrowLeft, ExternalLink } from 'lucide-react';

export default function MarketingPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [metaPixelId, setMetaPixelId] = useState('');
  const [ga4Id, setGa4Id] = useState('');
  const [gtmId, setGtmId] = useState('');
  const [tiktokPixelId, setTiktokPixelId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/marketing');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Load failed');
      setMetaPixelId(data.marketing?.metaPixelId || '');
      setGa4Id(data.marketing?.ga4Id || '');
      setGtmId(data.marketing?.gtmId || '');
      setTiktokPixelId(data.marketing?.tiktokPixelId || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load marketing config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/marketing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaPixelId, ga4Id, gtmId, tiktokPixelId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setToast('Marketing pixels saved to business config.');
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Merchant Hub
        </Link>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Share2 className="w-6 h-6 text-amber-400" /> Marketing & Feed Sync
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Meta, GA4, GTM, TikTok pixels — saved to business config (overrides env fallbacks).
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-2xl glass-card border border-zinc-800 space-y-4">
        {loading ? (
          <p className="text-xs text-zinc-400">Loading…</p>
        ) : (
          <>
            <label className="block text-xs font-bold text-zinc-400">
              Meta Pixel ID
              <input
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-zinc-400">
              GA4 Measurement ID
              <input
                value={ga4Id}
                onChange={(e) => setGa4Id(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
                placeholder="G-XXXXXXXXXX"
              />
            </label>
            <label className="block text-xs font-bold text-zinc-400">
              Google Tag Manager ID
              <input
                value={gtmId}
                onChange={(e) => setGtmId(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
                placeholder="GTM-XXXXXXX"
              />
            </label>
            <p className="text-[11px] text-zinc-500">
              If GTM is set, load GA4 inside GTM instead of using both GA4 and GTM fields.
            </p>
            <label className="block text-xs font-bold text-zinc-400">
              TikTok Pixel ID
              <input
                value={tiktokPixelId}
                onChange={(e) => setTiktokPixelId(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
              />
            </label>
          </>
        )}
        <button
          type="submit"
          disabled={loading || saving}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center gap-2 cursor-pointer btn-press disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Marketing Config'}
        </button>
        {toast && <p className="text-xs text-emerald-400">{toast}</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>

      <div className="p-5 rounded-2xl glass-card border border-zinc-800">
        <h2 className="font-bold text-white text-sm mb-2">Catalog Feeds</h2>
        <Link href="/" className="text-xs text-emerald-400 flex items-center gap-1 cursor-pointer">
          View public storefront catalog <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
