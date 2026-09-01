'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Palette, Eye, Save, CheckCircle2, MessageCircle } from 'lucide-react';
import type { StorefrontConfig } from '@/lib/config/storefront-config';

export default function StoreBuilderPage() {
  const [heroTitle, setHeroTitle] = useState('Shop Grabber');
  const [heroSubtitle, setHeroSubtitle] = useState('Browse live inventory and place COD orders online.');
  const [announcement, setAnnouncement] = useState('Free islandwide delivery on orders over LKR 10,000');
  const [whatsappNumber, setWhatsappNumber] = useState('+94771234567');
  const [themeColor, setThemeColor] = useState('#047857');
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/storefront');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Load failed');
      const sf = data.storefront as StorefrontConfig;
      const hero = sf.blocks.find((b) => b.type === 'HERO');
      const ann = sf.blocks.find((b) => b.type === 'ANNOUNCEMENT');
      if (hero && hero.type === 'HERO') {
        setHeroTitle(hero.title);
        setHeroSubtitle(hero.subtitle);
      }
      if (ann && ann.type === 'ANNOUNCEMENT') setAnnouncement(ann.text);
      setThemeColor(sf.theme.primaryColor);
      setWhatsappNumber(sf.theme.whatsappNumber || '+94771234567');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/settings/storefront', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storefront: {
            theme: {
              primaryColor: themeColor,
              accentColor: themeColor,
              whatsappNumber,
            },
            blocks: [
              { id: 'ann_1', type: 'ANNOUNCEMENT', text: announcement },
              {
                id: 'hero_1',
                type: 'HERO',
                title: heroTitle,
                subtitle: heroSubtitle,
                ctaLabel: 'Browse products',
              },
            ],
          },
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Visual Storefront Builder & Theme Customizer</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize branding, announcement banners, WhatsApp checkout channels, and homepage blocks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleSave({ preventDefault: () => {} } as React.FormEvent)}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          <span>{loading ? 'Loading…' : 'Save & Publish Changes'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center gap-2 font-bold text-xs">
          <CheckCircle2 className="h-4 w-4" />
          <span>Storefront saved to business_config — live on homepage.</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleSave} className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <span>Storefront Settings</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-muted-foreground block mb-1 font-medium">Top Announcement Bar</label>
              <input
                type="text"
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
              />
            </div>

            <div>
              <label className="text-muted-foreground block mb-1 font-medium">Hero Headline</label>
              <input
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
              />
            </div>

            <div>
              <label className="text-muted-foreground block mb-1 font-medium">Hero Subtitle</label>
              <textarea
                rows={2}
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
              />
            </div>

            <div>
              <label className="text-muted-foreground block mb-1 font-medium">WhatsApp Hotline Number</label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
              />
            </div>

            <div>
              <label className="text-muted-foreground block mb-1 font-medium">Primary Accent Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="h-8 w-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <span className="font-mono text-foreground font-semibold">{themeColor}</span>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-semibold">
            Save storefront
          </button>
        </form>

        <div className="lg:col-span-7 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-500" />
              <span>Live Storefront Preview</span>
            </h3>
          </div>

          <div className="rounded-2xl border border-border/80 overflow-hidden bg-background shadow-inner">
            <div className="py-1.5 px-3 text-center text-[10px] font-semibold text-white" style={{ backgroundColor: themeColor }}>
              {announcement}
            </div>
            <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white space-y-2">
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold">
                Official Online Store
              </span>
              <h3 className="text-lg font-bold">{heroTitle}</h3>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed max-w-md">{heroSubtitle}</p>
              <div className="pt-2 flex items-center gap-3">
                <button type="button" className="px-3 py-1 rounded-lg text-white text-[11px] font-semibold" style={{ backgroundColor: themeColor }}>
                  Shop Now
                </button>
                <button type="button" className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> WhatsApp Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
