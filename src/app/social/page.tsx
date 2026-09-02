'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Share2,
  Save,
  CheckCircle2,
  ExternalLink,
  Facebook,
  Instagram,
  MessageCircle,
  Youtube,
  Globe,
  Sparkles,
  Film,
  FileText,
  Megaphone,
  Copy,
  Radio,
  BarChart3,
  Loader2,
} from 'lucide-react';
import {
  SOCIAL_CHANNEL_DEFS,
  type SocialChannelId,
  type SocialChannelsConfig,
  type SocialChannelProfile,
} from '@/lib/social/channels';

type TabId = 'overview' | 'channels' | 'creative' | 'whatsapp' | 'feeds';

type HealthRow = {
  id: SocialChannelId;
  label: string;
  handle: string;
  profileUrl: string | null;
  status: 'connected' | 'partial' | 'missing';
  notes: string[];
};

type DashboardData = {
  health: {
    channels: HealthRow[];
    whatsappApi: boolean;
    metaCapi: boolean;
    gpuWorker: boolean;
  };
  channels: SocialChannelsConfig;
  pixels: Record<string, string | undefined>;
  creativeStats: { pdf: number; video: number; ugc: number; total: number };
  recentProjects: { id: string; title: string; status: string; outputUrl?: string | null }[];
  recentAssets: { id: string; title: string; url: string; assetType: string }[];
  salesByChannel: { channel: string; orders: number; revenue: number }[];
};

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'channels', label: 'Channels & Pixels' },
  { id: 'creative', label: 'Creative & Ads' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'feeds', label: 'Catalog Feeds' },
];

const CHANNEL_ICONS: Record<SocialChannelId, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Radio,
  whatsapp: MessageCircle,
  youtube: Youtube,
  google: Globe,
};

function statusColor(s: HealthRow['status']) {
  if (s === 'connected') return 'bg-emerald-500';
  if (s === 'partial') return 'bg-amber-500';
  return 'bg-zinc-500';
}

export default function SocialChannelManagerPage() {
  const [tab, setTab] = useState<TabId>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [channels, setChannels] = useState<SocialChannelsConfig>({});
  const [metaPixelId, setMetaPixelId] = useState('');
  const [ga4Id, setGa4Id] = useState('');
  const [gtmId, setGtmId] = useState('');
  const [tiktokPixelId, setTiktokPixelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [waPhone, setWaPhone] = useState('94771234567');
  const [waText, setWaText] = useState('');
  const [waBusy, setWaBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, chanRes] = await Promise.all([
        fetch('/api/social/dashboard'),
        fetch('/api/social/channels'),
      ]);
      const dash = await dashRes.json();
      const chan = await chanRes.json();
      if (dash.success) setData(dash);
      if (chan.success) {
        setChannels(chan.channels || {});
        setMetaPixelId(chan.marketing?.metaPixelId || chan.pixels?.metaPixelId || '');
        setGa4Id(chan.marketing?.ga4Id || chan.pixels?.ga4Id || '');
        setGtmId(chan.marketing?.gtmId || chan.pixels?.gtmId || '');
        setTiktokPixelId(chan.marketing?.tiktokPixelId || chan.pixels?.tiktokPixelId || '');
        const wa = chan.channels?.whatsapp;
        if (wa?.phone || wa?.handle) setWaPhone(String(wa.phone || wa.handle).replace(/\D/g, ''));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab') as TabId | null;
    if (t && TAB_LABELS.some((x) => x.id === t)) setTab(t);
  }, []);

  function patchChannel(id: SocialChannelId, patch: Partial<SocialChannelProfile>) {
    setChannels((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveAll(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/social/channels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channels,
          marketing: { metaPixelId, ga4Id, gtmId, tiktokPixelId },
        }),
      });
      const out = await res.json();
      if (!out.success) throw new Error(out.error || 'Save failed');
      setMsg('Social channels, handles, and pixels saved.');
      await load();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function sendWhatsApp() {
    if (!waText.trim()) return;
    setWaBusy(true);
    try {
      const res = await fetch('/api/integrations/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: waPhone, text: waText }),
      });
      const out = await res.json();
      setMsg(out.success ? 'WhatsApp message sent.' : out.error || 'Send failed');
    } finally {
      setWaBusy(false);
    }
  }

  const creativeLinks = useMemo(
    () => [
      { href: '/creative/ugc-ads', label: 'UGC Ads', icon: Megaphone, desc: 'Hooks → scripts → variations' },
      { href: '/creative/videos', label: 'Video Studio', icon: Film, desc: 'Reels, promos, 9:16 / 1:1' },
      { href: '/creative/pdf', label: 'PDF Studio', icon: FileText, desc: 'Catalogs, flyers, price lists' },
      { href: '/creative/campaigns', label: 'All campaigns', icon: Sparkles, desc: 'Approve → storefront' },
    ],
    [],
  );

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Social Channel Manager…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-xs text-muted-foreground hover:text-indigo-500 mb-2 inline-block">
          ← Merchant Hub
        </Link>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Share2 className="h-6 w-6 text-indigo-500" />
          Social Channel Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          One dashboard — channel handles, pixels, creative ads, WhatsApp, and catalog feeds.
        </p>
      </div>

      <nav className="flex flex-wrap gap-1.5 border-b border-border pb-3">
        {TAB_LABELS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold border ${
              tab === t.id
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600'
                : 'border-border text-muted-foreground hover:border-indigo-500/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {data.health.channels.map((ch) => {
              const Icon = CHANNEL_ICONS[ch.id];
              return (
                <div key={ch.id} className="p-4 rounded-2xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-4 w-4 text-indigo-500" />
                    <span className={`h-2 w-2 rounded-full ${statusColor(ch.status)}`} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{ch.label}</p>
                  <p className="font-bold text-xs mt-0.5 truncate">{ch.handle}</p>
                  {ch.profileUrl && (
                    <a href={ch.profileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline mt-1 inline-flex items-center gap-0.5">
                      Open <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" /> Creative output
              </h3>
              <p className="text-2xl font-bold mt-2">{data.creativeStats.total}</p>
              <p className="text-[11px] text-muted-foreground">
                {data.creativeStats.ugc} UGC · {data.creativeStats.video} video · {data.creativeStats.pdf} PDF
              </p>
              <button type="button" onClick={() => setTab('creative')} className="text-[11px] text-indigo-600 font-semibold mt-2 hover:underline">
                Open Creative & Ads →
              </button>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-500" /> Sales by channel
              </h3>
              <ul className="mt-2 space-y-1 text-[11px]">
                {data.salesByChannel.length ? (
                  data.salesByChannel.map((s) => (
                    <li key={s.channel} className="flex justify-between">
                      <span>{s.channel}</span>
                      <span className="font-mono">{s.orders} · LKR {s.revenue.toLocaleString()}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">No orders yet</li>
                )}
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border text-[11px] space-y-2">
              <h3 className="font-semibold text-sm">Pipeline</h3>
              <p className={data.health.metaCapi ? 'text-emerald-600' : 'text-amber-600'}>
                Meta CAPI: {data.health.metaCapi ? 'Token set' : 'Missing META_CONVERSIONS_API_TOKEN'}
              </p>
              <p className={data.health.whatsappApi ? 'text-emerald-600' : 'text-amber-600'}>
                WhatsApp API: {data.health.whatsappApi ? 'Connected' : 'Stub / not configured'}
              </p>
              <p className={data.health.gpuWorker ? 'text-emerald-600' : 'text-muted-foreground'}>
                GPU worker: {data.health.gpuWorker ? 'CREATIVE_WORKER_URL set' : 'Optional — use for video/UGC'}
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'channels' && (
        <form onSubmit={(e) => void saveAll(e)} className="space-y-6 max-w-3xl">
          <div className="space-y-4">
            {SOCIAL_CHANNEL_DEFS.map((def) => {
              const Icon = CHANNEL_ICONS[def.id];
              const profile = channels[def.id] || {};
              return (
                <div key={def.id} className="p-5 rounded-2xl bg-card border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-indigo-500" />
                    <h3 className="font-bold text-sm">{def.label}</h3>
                    <label className="ml-auto flex items-center gap-1.5 text-[10px]">
                      <input
                        type="checkbox"
                        checked={profile.enabled !== false}
                        onChange={(e) => patchChannel(def.id, { enabled: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className="block">
                      <span className="text-muted-foreground">Handle {def.handlePrefix && `(${def.handlePrefix}…)`}</span>
                      <input
                        value={profile.handle || ''}
                        onChange={(e) => patchChannel(def.id, { handle: e.target.value })}
                        placeholder={def.handlePlaceholder}
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono"
                      />
                    </label>
                    <label className="block">
                      <span className="text-muted-foreground">Profile URL</span>
                      <input
                        value={profile.profileUrl || ''}
                        onChange={(e) => patchChannel(def.id, { profileUrl: e.target.value })}
                        placeholder={def.profileUrlPlaceholder}
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono text-[11px]"
                      />
                    </label>
                    {def.id === 'facebook' && (
                      <>
                        <label className="block">
                          <span className="text-muted-foreground">Facebook Page ID</span>
                          <input
                            value={profile.pageId || ''}
                            onChange={(e) => patchChannel(def.id, { pageId: e.target.value })}
                            className="mt-1 w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono"
                          />
                        </label>
                        <label className="block">
                          <span className="text-muted-foreground">Meta Ad Account ID</span>
                          <input
                            value={profile.adAccountId || ''}
                            onChange={(e) => patchChannel(def.id, { adAccountId: e.target.value })}
                            className="mt-1 w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono"
                          />
                        </label>
                      </>
                    )}
                    {def.id === 'whatsapp' && (
                      <label className="block sm:col-span-2">
                        <span className="text-muted-foreground">WhatsApp business number (E.164)</span>
                        <input
                          value={profile.phone || profile.handle || ''}
                          onChange={(e) => patchChannel(def.id, { phone: e.target.value, handle: e.target.value })}
                          placeholder="94771234567"
                          className="mt-1 w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono"
                        />
                      </label>
                    )}
                  </div>
                  {def.exports.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Export presets: {def.exports.map((e) => `${e.label} (${e.aspectRatio})`).join(' · ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <h3 className="font-bold text-sm">Tracking pixels & analytics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="block">
                <span className="text-muted-foreground">Meta Pixel ID</span>
                <input value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono" />
              </label>
              <label className="block">
                <span className="text-muted-foreground">TikTok Pixel ID</span>
                <input value={tiktokPixelId} onChange={(e) => setTiktokPixelId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono" />
              </label>
              <label className="block">
                <span className="text-muted-foreground">GA4 Measurement ID</span>
                <input value={ga4Id} onChange={(e) => setGa4Id(e.target.value)} placeholder="G-XXXXXXXXXX" className="mt-1 w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono" />
              </label>
              <label className="block">
                <span className="text-muted-foreground">Google Tag Manager</span>
                <input value={gtmId} onChange={(e) => setGtmId(e.target.value)} placeholder="GTM-XXXXXXX" className="mt-1 w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono" />
              </label>
            </div>
          </div>

          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save channels & pixels'}
          </button>
          {msg && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> {msg}</p>}
        </form>
      )}

      {tab === 'creative' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {creativeLinks.map((c) => (
              <Link key={c.href} href={c.href} className="p-4 rounded-2xl bg-card border border-border hover:border-indigo-500/40 transition-colors">
                <c.icon className="h-5 w-5 text-indigo-500 mb-2" />
                <p className="font-bold text-sm">{c.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{c.desc}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <h3 className="font-semibold text-sm">Recent campaigns</h3>
              {data.recentProjects.map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-secondary/50 border border-border/40 flex justify-between gap-2 items-start">
                  <div>
                    <p className="font-bold text-xs">{p.title.replace(/^\[(PDF|VIDEO|UGC|CAMPAIGN)\]\s*/i, '')}</p>
                    <p className="text-[10px] text-muted-foreground">{p.status}</p>
                  </div>
                  {p.outputUrl && (
                    <button
                      type="button"
                      className="text-[10px] text-indigo-600 font-semibold shrink-0"
                      onClick={() => void navigator.clipboard.writeText(p.outputUrl!)}
                    >
                      <Copy className="h-3 w-3 inline" /> Copy media URL
                    </button>
                  )}
                </div>
              ))}
              {!data.recentProjects.length && <p className="text-xs text-muted-foreground">No campaigns — create UGC or video ads.</p>}
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <h3 className="font-semibold text-sm">Asset library</h3>
              {data.recentAssets.map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block p-3 rounded-xl bg-secondary/50 border border-border/40 text-xs hover:border-indigo-500/30">
                  <span className="text-[10px] text-muted-foreground">{a.assetType}</span>
                  <p className="font-bold">{a.title}</p>
                </a>
              ))}
              <Link href="/creative/assets" className="text-[11px] text-indigo-600 font-semibold hover:underline">
                View all assets →
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-[11px]">
            <p className="font-bold text-indigo-700 mb-1">Channel-ready exports</p>
            <p className="text-muted-foreground">
              UGC and Video Studio render 9:16 (Reels/TikTok), 1:1 (IG/FB feed), 16:9 (YouTube). After render, copy media URL and post via your connected handles above — Meta Ads API posting coming next.
            </p>
          </div>
        </div>
      )}

      {tab === 'whatsapp' && (
        <div className="max-w-xl space-y-4 p-6 rounded-2xl bg-card border border-border">
          <h3 className="font-semibold text-sm">Quick broadcast</h3>
          <p className="text-[11px] text-muted-foreground">
            Send promo copy to a customer or test number. Full automation at{' '}
            <Link href="/whatsapp" className="text-indigo-600 hover:underline">WhatsApp Center</Link>.
          </p>
          <input value={waPhone} onChange={(e) => setWaPhone(e.target.value.replace(/\D/g, ''))} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono text-sm" placeholder="94771234567" />
          <textarea value={waText} onChange={(e) => setWaText(e.target.value)} rows={4} placeholder="New drop live — shop now!" className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm" />
          <button type="button" disabled={waBusy} onClick={() => void sendWhatsApp()} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs disabled:opacity-50">
            {waBusy ? 'Sending…' : 'Send WhatsApp'}
          </button>
          {msg && <p className="text-xs text-emerald-600">{msg}</p>}
        </div>
      )}

      {tab === 'feeds' && (
        <div className="space-y-4 max-w-2xl">
          <div className="p-5 rounded-2xl bg-card border border-border">
            <h3 className="font-bold text-sm mb-2">Meta / Google catalog feed</h3>
            <p className="text-[11px] text-muted-foreground mb-3">
              Live product XML for Meta Commerce Manager and Google Merchant Center.
            </p>
            <a href="/api/social/feeds/meta-catalog" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-indigo-600 font-semibold hover:underline">
              Download meta-catalog.xml <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <Link href="/" className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
            View public storefront catalog <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
