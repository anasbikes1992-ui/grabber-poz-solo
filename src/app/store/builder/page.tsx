'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Layers, MessageCircle, Palette, Save, CheckCircle2 } from 'lucide-react';
import type { StorefrontBlock, StorefrontConfig } from '@/lib/config/storefront-config';
import { DEFAULT_STOREFRONT } from '@/lib/config/storefront-config';

const SLOT_LABELS: Record<string, string> = {
  TOP: 'Top announcement bar',
  HERO: 'Hero section',
  MID: 'Mid-page banner',
  PRE_CATALOG: 'Before catalog (featured)',
  FOOTER: 'Footer CTA band',
};

export default function StoreBuilderPage() {
  const [config, setConfig] = useState<StorefrontConfig>(DEFAULT_STOREFRONT);
  const [featuredSlugs, setFeaturedSlugs] = useState('');
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
      setConfig(sf);
      const featured = sf.blocks.find((b) => b.type === 'FEATURED');
      if (featured?.type === 'FEATURED') setFeaturedSlugs(featured.productSlugs.join(', '));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patchBlock(id: string, patch: Partial<StorefrontBlock>) {
    setConfig((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as StorefrontBlock) : b)),
    }));
  }

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    try {
      const blocks = config.blocks.map((b) => {
        if (b.type === 'FEATURED') {
          return {
            ...b,
            productSlugs: featuredSlugs
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          };
        }
        return b;
      });

      const res = await fetch('/api/settings/storefront', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storefront: {
            theme: config.theme,
            blocks,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setConfig(data.storefront);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const ann = config.blocks.find((b) => b.type === 'ANNOUNCEMENT');
  const hero = config.blocks.find((b) => b.type === 'HERO');
  const mid = config.blocks.find((b) => b.type === 'MID_BANNER') || config.blocks.find((b) => b.type === 'VERTICAL_PROMO');
  const footer = config.blocks.find((b) => b.type === 'FOOTER_CTA');
  const featured = config.blocks.find((b) => b.type === 'FEATURED');

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Storefront Builder</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Banner slots: TOP → HERO → MID → PRE_CATALOG → FOOTER · Theme tokens sync to live storefront CSS vars.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading}
          className="flex items-center gap-2 self-start rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm disabled:opacity-50 sm:self-auto"
        >
          <Save className="h-3.5 w-3.5" />
          {loading ? 'Loading…' : 'Save & publish'}
        </button>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          Storefront saved — live on homepage.
        </div>
      )}
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-border bg-card p-5 text-xs lg:col-span-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Palette className="h-4 w-4 text-primary" />
            Theme & banners
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-medium text-muted-foreground">Primary (stone)</label>
              <input
                type="color"
                value={config.theme.primaryColor}
                onChange={(e) => setConfig((p) => ({ ...p, theme: { ...p.theme, primaryColor: e.target.value } }))}
                className="h-9 w-full cursor-pointer rounded-lg"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-muted-foreground">Accent (gold CTA)</label>
              <input
                type="color"
                value={config.theme.accentColor}
                onChange={(e) => setConfig((p) => ({ ...p, theme: { ...p.theme, accentColor: e.target.value } }))}
                className="h-9 w-full cursor-pointer rounded-lg"
              />
            </div>
          </div>

          {ann?.type === 'ANNOUNCEMENT' && (
            <div>
              <label className="mb-1 block font-medium text-muted-foreground">{SLOT_LABELS.TOP}</label>
              <input
                value={ann.text}
                onChange={(e) => patchBlock(ann.id, { text: e.target.value })}
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-medium text-foreground"
              />
            </div>
          )}

          {hero?.type === 'HERO' && (
            <>
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">{SLOT_LABELS.HERO} title</label>
                <input
                  value={hero.title}
                  onChange={(e) => patchBlock(hero.id, { title: e.target.value })}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-medium text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">Hero subtitle</label>
                <textarea
                  rows={2}
                  value={hero.subtitle}
                  onChange={(e) => patchBlock(hero.id, { subtitle: e.target.value })}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-medium text-foreground"
                />
              </div>
            </>
          )}

          {mid && (
            <div>
              <label className="mb-1 block font-medium text-muted-foreground">{SLOT_LABELS.MID}</label>
              <input
                value={mid.title}
                onChange={(e) => patchBlock(mid.id, { title: e.target.value })}
                className="mb-2 w-full rounded-xl border border-border bg-secondary px-3 py-2 font-medium text-foreground"
              />
              {'body' in mid && (
                <textarea
                  rows={2}
                  value={mid.body}
                  onChange={(e) => patchBlock(mid.id, { body: e.target.value })}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-medium text-foreground"
                />
              )}
            </div>
          )}

          {featured?.type === 'FEATURED' && (
            <div>
              <label className="mb-1 block font-medium text-muted-foreground">{SLOT_LABELS.PRE_CATALOG} slugs</label>
              <input
                value={featuredSlugs}
                onChange={(e) => setFeaturedSlugs(e.target.value)}
                placeholder="product-slug-1, product-slug-2"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-mono text-foreground"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Comma-separated product slugs; empty shows first 3 catalog items.</p>
            </div>
          )}

          {footer?.type === 'FOOTER_CTA' && (
            <>
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">{SLOT_LABELS.FOOTER} title</label>
                <input
                  value={footer.title}
                  onChange={(e) => patchBlock(footer.id, { title: e.target.value })}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-medium text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">Footer body</label>
                <textarea
                  rows={2}
                  value={footer.body}
                  onChange={(e) => patchBlock(footer.id, { body: e.target.value })}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-medium text-foreground"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block font-medium text-muted-foreground">WhatsApp number</label>
            <input
              value={config.theme.whatsappNumber || ''}
              onChange={(e) => setConfig((p) => ({ ...p, theme: { ...p.theme, whatsappNumber: e.target.value } }))}
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-mono text-foreground"
            />
          </div>

          <button type="submit" className="w-full rounded-xl bg-primary py-2 font-semibold text-primary-foreground">
            Save storefront
          </button>
        </form>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 lg:col-span-7">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Eye className="h-4 w-4 text-indigo-500" />
            Slot preview
          </h3>
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-background shadow-inner">
            {ann?.type === 'ANNOUNCEMENT' && (
              <div className="px-3 py-1.5 text-center text-[10px] font-semibold text-white" style={{ background: config.theme.primaryColor }}>
                {ann.text}
              </div>
            )}
            <div className="space-y-2 p-6" style={{ background: `linear-gradient(120deg, ${config.theme.accentColor}14, transparent)` }}>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--sf-accent)]">HERO</span>
              <h3 className="text-lg font-bold" style={{ color: config.theme.primaryColor }}>
                {hero?.type === 'HERO' ? hero.title : 'Hero'}
              </h3>
              <p className="max-w-md text-[11px] leading-relaxed opacity-80">{hero?.type === 'HERO' ? hero.subtitle : ''}</p>
            </div>
            {mid && (
              <div className="border-t border-border/50 bg-muted/30 px-6 py-4">
                <p className="text-[9px] font-semibold uppercase text-muted-foreground">MID</p>
                <p className="text-sm font-bold">{mid.title}</p>
              </div>
            )}
            {footer?.type === 'FOOTER_CTA' && (
              <div className="flex items-center justify-between gap-3 px-6 py-4 text-white" style={{ background: config.theme.primaryColor }}>
                <div>
                  <p className="text-sm font-bold">{footer.title}</p>
                  <p className="text-[10px] opacity-80">{footer.body}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-bold" style={{ color: config.theme.primaryColor }}>
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-dashed border-border p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              Block order on live site
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] text-muted-foreground">
              {['TOP announcement', 'HERO + bag card', 'MID promos', 'FEATURED picks', 'Catalog grid', 'FOOTER WhatsApp CTA'].map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
