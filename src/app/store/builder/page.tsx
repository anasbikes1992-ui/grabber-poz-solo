'use client';

import React, { useState } from 'react';
import { Palette, Eye, Save, CheckCircle2, Store, Sparkles, MessageCircle } from 'lucide-react';

export default function StoreBuilderPage() {
  const [heroTitle, setHeroTitle] = useState('Summer Essentials Collection');
  const [heroSubtitle, setHeroSubtitle] = useState('Premium casual menswear crafted with 100% pure breathable fabrics.');
  const [announcement, setAnnouncement] = useState('🚚 Free Islandwide Delivery on Orders Over LKR 10,000!');
  const [whatsappNumber, setWhatsappNumber] = useState('+94 77 123 4567');
  const [themeColor, setThemeColor] = useState('#2563eb');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Visual Storefront Builder & Theme Customizer</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize branding, announcement banners, WhatsApp checkout channels, and SEO meta tags.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Save className="h-3.5 w-3.5" />
          <span>Save & Publish Changes</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center gap-2 font-bold text-xs">
          <CheckCircle2 className="h-4 w-4" />
          <span>Storefront Customizations Published Live!</span>
        </div>
      )}

      {/* Grid: Editor Form vs Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Customization Controls */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4 text-xs">
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
        </div>

        {/* Right 7 Cols: Live Preview */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-500" />
              <span>Live Storefront Preview</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground font-semibold">
              Responsive
            </span>
          </div>

          <div className="rounded-2xl border border-border/80 overflow-hidden bg-background shadow-inner">
            {/* Announcement bar */}
            <div className="py-1.5 px-3 bg-primary text-primary-foreground text-center text-[10px] font-semibold">
              {announcement}
            </div>

            {/* Mock Storefront Hero */}
            <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white space-y-2">
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 font-semibold">
                Official Online Store
              </span>
              <h3 className="text-lg font-bold">{heroTitle}</h3>
              <p className="text-[11px] text-blue-200/80 leading-relaxed max-w-md">{heroSubtitle}</p>
              <div className="pt-2 flex items-center gap-3">
                <button className="px-3 py-1 rounded-lg bg-primary text-white text-[11px] font-semibold">
                  Shop Now
                </button>
                <button className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1">
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
