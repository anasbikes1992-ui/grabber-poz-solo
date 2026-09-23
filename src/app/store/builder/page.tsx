'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Eye,
  Layers,
  Palette,
  Save,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2,
  Image as ImageIcon,
  Folder,
  Upload,
  Download,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Crown,
  Heart,
  Flame,
  PartyPopper,
  SlidersHorizontal,
} from 'lucide-react';
import type { StorefrontBlock, StorefrontConfig } from '@/lib/config/storefront-config.shared';
import { DEFAULT_STOREFRONT } from '@/lib/config/storefront-config.shared';
import type { HeroSlide } from '@/components/storefront/HeroSlider';
import {
  applyStorefrontThemePreset,
  listStorefrontThemePresets,
  resolveStorefrontTheme,
} from '@/lib/storefront/theme-presets';
import { storefrontThemeStyle } from '@/lib/storefront/theme-vars';
import { MediaFolderModal } from '@/components/storefront/MediaFolderModal';
import type { MediaAssetItem } from '@/app/api/storage/media/route';

const SLOT_LABELS: Record<string, string> = {
  TOP: 'Top announcement bar',
  HERO: 'Hero section (Banner slides & theme)',
  MID: 'Mid-page highlight banner',
  PRE_CATALOG: 'Before catalog (featured picks)',
  FOOTER: 'Footer CTA band',
};

type ImageMeta = {
  width?: number;
  height?: number;
  sizeFormatted?: string;
};

export default function StoreBuilderPage() {
  const [config, setConfig] = useState<StorefrontConfig>(DEFAULT_STOREFRONT);
  const [featuredSlugs, setFeaturedSlugs] = useState('');
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Media Folder state
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [uploadingSlide, setUploadingSlide] = useState(false);
  const [imageMetaMap, setImageMetaMap] = useState<Record<string, ImageMeta>>({});
  const slideFileInputRef = useRef<HTMLInputElement>(null);

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

  const heroSlider = config.blocks.find((b) => b.type === 'HERO_SLIDER');
  const activeSlide = heroSlider?.slides[activeSlideIdx];

  // Inspect image dimensions dynamically when active slide image changes
  useEffect(() => {
    if (!activeSlide?.imageUrl) return;
    const url = activeSlide.imageUrl;
    if (imageMetaMap[url]) return;

    const img = new Image();
    img.src = url;
    img.onload = () => {
      setImageMetaMap((prev) => ({
        ...prev,
        [url]: { ...prev[url], width: img.naturalWidth, height: img.naturalHeight },
      }));
    };
  }, [activeSlide?.imageUrl, imageMetaMap]);

  function patchBlock(id: string, patch: Partial<StorefrontBlock>) {
    setConfig((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as StorefrontBlock) : b)),
    }));
  }

  function updateSlide(sliderId: string, slideIndex: number, patch: Partial<HeroSlide>) {
    setConfig((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== sliderId || b.type !== 'HERO_SLIDER') return b;
        const nextSlides = [...b.slides];
        nextSlides[slideIndex] = { ...nextSlides[slideIndex], ...patch };
        return { ...b, slides: nextSlides };
      }),
    }));
  }

  function addSlide(sliderId: string) {
    setConfig((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== sliderId || b.type !== 'HERO_SLIDER') return b;
        const newSlide: HeroSlide = {
          title: 'Special Event Collection',
          subtitle: 'Discover themed decorations and party supplies for unforgettable celebrations.',
          ctaLabel: 'Browse collection',
          ctaHref: '/shop#catalog',
          imageUrl: '',
          badge: '🎉 New Theme Pack',
        };
        const nextSlides = [...b.slides, newSlide];
        setActiveSlideIdx(nextSlides.length - 1);
        return { ...b, slides: nextSlides };
      }),
    }));
  }

  function removeSlide(sliderId: string, slideIndex: number) {
    setConfig((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== sliderId || b.type !== 'HERO_SLIDER') return b;
        if (b.slides.length <= 1) return b;
        const nextSlides = b.slides.filter((_, idx) => idx !== slideIndex);
        setActiveSlideIdx((curr) => Math.min(curr, nextSlides.length - 1));
        return { ...b, slides: nextSlides };
      }),
    }));
  }

  const handleSlideFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !heroSlider) return;

    setUploadingSlide(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');

      const uploadedUrl = data.relativePath || data.url;
      updateSlide(heroSlider.id, activeSlideIdx, { imageUrl: uploadedUrl });

      setImageMetaMap((prev) => ({
        ...prev,
        [uploadedUrl]: {
          sizeFormatted: data.sizeFormatted,
        },
      }));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploadingSlide(false);
      if (slideFileInputRef.current) slideFileInputRef.current.value = '';
    }
  };

  const handleDownloadSlideMedia = (imageUrl?: string) => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = imageUrl.split('/').pop()?.split('?')[0] || 'party-slide-image.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopySlidePath = (pathText?: string) => {
    if (!pathText) return;
    navigator.clipboard.writeText(pathText);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

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
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const ann = config.blocks.find((b) => b.type === 'ANNOUNCEMENT');
  const hero = config.blocks.find((b) => b.type === 'HERO');
  const mid =
    config.blocks.find((b) => b.type === 'MID_BANNER') ||
    config.blocks.find((b) => b.type === 'VERTICAL_PROMO');
  const footer = config.blocks.find((b) => b.type === 'FOOTER_CTA');
  const featured = config.blocks.find((b) => b.type === 'FEATURED');
  const presets = listStorefrontThemePresets();
  const resolvedTheme = resolveStorefrontTheme(config.theme);
  const activePresetId = config.theme.presetId || 'party-pop';

  function selectPreset(presetId: string, updateHeroCopy: boolean) {
    setConfig((prev) => applyStorefrontThemePreset(prev, presetId, { updateHeroCopy }));
  }

  const activeMeta = activeSlide?.imageUrl ? imageMetaMap[activeSlide.imageUrl] : undefined;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rose-500" />
            Storefront Builder & Exploding Hero Designer
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage multi-slide carousel banners, celebratory party themes, and media library assets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Media Folder Quick Button */}
          <button
            type="button"
            onClick={() => setMediaModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-xs hover:bg-secondary cursor-pointer transition-colors"
          >
            <Folder className="h-4 w-4 text-amber-500" />
            <span>Media Folder (4,000+ Assets)</span>
          </button>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {loading ? 'Loading…' : 'Save & Publish Live'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          Storefront saved successfully — published and active on live domain.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Main Grid: Editor on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Editor Column */}
        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-2xl border border-border bg-card p-5 text-xs lg:col-span-6"
        >
          {/* THEMES SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Palette className="h-4 w-4 text-primary" />
                5 Interactive Themes (/ui-ux-pro-max)
              </h3>
              <span className="text-[11px] font-semibold text-rose-500">Live Effects & Transitions</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {presets.map((preset) => {
                const active = activePresetId === preset.id;
                const swatch = resolveStorefrontTheme(preset.theme);
                const fxIcon = () => {
                  switch (preset.theme.interactiveFx) {
                    case 'neon':
                      return <Zap className="h-3 w-3 text-cyan-400" />;
                    case 'gold':
                      return <Crown className="h-3 w-3 text-amber-500" />;
                    case 'bubbles':
                      return <Heart className="h-3 w-3 text-pink-400" />;
                    case 'ticker':
                      return <Flame className="h-3 w-3 text-yellow-400" />;
                    default:
                      return <PartyPopper className="h-3 w-3 text-rose-500" />;
                  }
                };

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectPreset(preset.id, false)}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      active
                        ? 'border-primary ring-2 ring-primary/30 shadow-md bg-primary/5'
                        : 'border-border hover:border-primary/40 bg-card hover:bg-secondary/30'
                    }`}
                  >
                    <div>
                      {/* Gradient Bar Preview */}
                      <div
                        className="mb-2 h-9 w-full rounded-xl border border-black/10 shadow-xs relative overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${swatch.backgroundColor} 20%, ${swatch.primaryColor} 60%, ${swatch.accentColor} 100%)`,
                        }}
                      >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="absolute bottom-1 right-2 text-[9px] font-mono font-bold text-white drop-shadow-md uppercase">
                          {preset.theme.colorScheme || 'light'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-xs font-bold text-foreground">{preset.label}</p>
                        {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </div>
                      <p className="line-clamp-2 text-[10px] leading-tight text-muted-foreground mt-0.5">
                        {preset.description}
                      </p>
                    </div>

                    {/* Effect Badges */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[9px] font-bold text-foreground">
                        {fxIcon()}
                        <span className="capitalize">{preset.theme.interactiveFx || 'confetti'}</span>
                      </span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[9px] font-mono text-muted-foreground">
                        {preset.theme.carouselEffect?.replace('-', ' ') || 'spring'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* COLOR PICKERS */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div>
              <label className="mb-1 block font-medium text-muted-foreground">Primary Brand Color</label>
              <input
                type="color"
                value={config.theme.primaryColor}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, theme: { ...p.theme, primaryColor: e.target.value } }))
                }
                className="h-9 w-full cursor-pointer rounded-xl border border-border"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-muted-foreground">Accent CTA Color</label>
              <input
                type="color"
                value={config.theme.accentColor}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, theme: { ...p.theme, accentColor: e.target.value } }))
                }
                className="h-9 w-full cursor-pointer rounded-xl border border-border"
              />
            </div>
          </div>

          {/* TOP ANNOUNCEMENT BAR */}
          {ann?.type === 'ANNOUNCEMENT' && (
            <div className="pt-3 border-t border-border space-y-2">
              <label className="mb-1 block font-bold text-foreground">{SLOT_LABELS.TOP}</label>
              <input
                value={ann.text}
                onChange={(e) => patchBlock(ann.id, { text: e.target.value })}
                placeholder="Announcement banner text"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-medium text-foreground"
              />
            </div>
          )}

          {/* MULTI-SLIDE CAROUSEL MANAGER */}
          {heroSlider?.type === 'HERO_SLIDER' && (
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    Multi-Banner Slides Carousel
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Rotating celebratory banners on the store hero ({heroSlider.slides.length} slides active).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addSlide(heroSlider.id)}
                  className="flex items-center gap-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Slide
                </button>
              </div>

              {/* Slide Tabs */}
              <div className="flex flex-wrap gap-1.5">
                {heroSlider.slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlideIdx(idx)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      activeSlideIdx === idx
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Slide {idx + 1}
                  </button>
                ))}
              </div>

              {/* Current Active Slide Form */}
              {activeSlide && (
                <div className="space-y-4 p-4 rounded-2xl border border-border/80 bg-secondary/20">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                        {activeSlideIdx + 1}
                      </span>
                      Editing Slide #{activeSlideIdx + 1}
                    </span>

                    {heroSlider.slides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlide(heroSlider.id, activeSlideIdx)}
                        className="text-red-500 hover:text-red-600 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block font-medium text-muted-foreground">Slide Title / Headline</label>
                    <input
                      value={activeSlide.title}
                      onChange={(e) =>
                        updateSlide(heroSlider.id, activeSlideIdx, { title: e.target.value })
                      }
                      placeholder="e.g. Make every party pop"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground font-semibold"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-medium text-muted-foreground">
                      Subtitle / Celebration Description
                    </label>
                    <textarea
                      rows={2}
                      value={activeSlide.subtitle || ''}
                      onChange={(e) =>
                        updateSlide(heroSlider.id, activeSlideIdx, { subtitle: e.target.value })
                      }
                      placeholder="e.g. Balloons, themes, banners, candles and tableware..."
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground"
                    />
                  </div>

                  {/* SLIDE MEDIA UPLOAD, DOWNLOAD & PATH SECTION */}
                  <div className="space-y-2 rounded-xl border border-border bg-card p-3.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-foreground flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        Slide Media (Image & Banner)
                      </label>
                      <button
                        type="button"
                        onClick={() => setMediaModalOpen(true)}
                        className="flex items-center gap-1 text-primary hover:underline text-[11px] font-bold cursor-pointer"
                      >
                        <Folder className="h-3.5 w-3.5" />
                        Browse Media Folder
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        value={activeSlide.imageUrl || ''}
                        onChange={(e) =>
                          updateSlide(heroSlider.id, activeSlideIdx, { imageUrl: e.target.value })
                        }
                        placeholder="/uploads/clients/thepartystore/products/Baby Shower Decoration Package 1.jpg"
                        className="flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-2 font-mono text-[11px] text-foreground"
                      />

                      <input
                        type="file"
                        ref={slideFileInputRef}
                        onChange={handleSlideFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => slideFileInputRef.current?.click()}
                        disabled={uploadingSlide}
                        className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>{uploadingSlide ? 'Uploading…' : 'Upload'}</span>
                      </button>
                    </div>

                    {/* MEDIA DETAILS, SIZE, PATH & DOWNLOAD BUTTON */}
                    {activeSlide.imageUrl && (
                      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border/80 bg-secondary/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={activeSlide.imageUrl}
                              alt="Slide preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <p className="truncate max-w-[200px] text-xs font-bold text-foreground">
                              {activeSlide.imageUrl.split('/').pop()?.split('?')[0]}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                              {activeMeta?.width && activeMeta?.height && (
                                <span>
                                  {activeMeta.width} × {activeMeta.height} px
                                </span>
                              )}
                              {activeMeta?.sizeFormatted && <span>• {activeMeta.sizeFormatted}</span>}
                              {!activeMeta?.sizeFormatted && <span>• Stored on Server</span>}
                            </div>
                            <p className="truncate max-w-[240px] text-[10px] text-muted-foreground/80 font-mono">
                              Path: {activeSlide.imageUrl}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleCopySlidePath(activeSlide.imageUrl)}
                            title="Copy Path"
                            className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-secondary cursor-pointer"
                          >
                            {copiedPath ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            <span>{copiedPath ? 'Copied' : 'Copy Path'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadSlideMedia(activeSlide.imageUrl)}
                            title="Download Image"
                            className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20 cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block font-medium text-muted-foreground">Button Label</label>
                      <input
                        value={activeSlide.ctaLabel || ''}
                        onChange={(e) =>
                          updateSlide(heroSlider.id, activeSlideIdx, { ctaLabel: e.target.value })
                        }
                        placeholder="Browse catalog"
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-muted-foreground">Button Link</label>
                      <input
                        value={activeSlide.ctaHref || ''}
                        onChange={(e) =>
                          updateSlide(heroSlider.id, activeSlideIdx, { ctaHref: e.target.value })
                        }
                        placeholder="/shop#catalog"
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-[11px] text-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MID PAGE BANNER */}
          {mid && (
            <div className="pt-3 border-t border-border space-y-2">
              <label className="mb-1 block font-bold text-foreground">{SLOT_LABELS.MID}</label>
              <input
                value={mid.title}
                onChange={(e) => patchBlock(mid.id, { title: e.target.value })}
                placeholder="Mid-page banner title"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-medium text-foreground"
              />
              {'body' in mid && (
                <textarea
                  rows={2}
                  value={mid.body}
                  onChange={(e) => patchBlock(mid.id, { body: e.target.value })}
                  placeholder="Mid-page banner description"
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-medium text-foreground"
                />
              )}
            </div>
          )}

          {/* FEATURED PICKS */}
          {featured?.type === 'FEATURED' && (
            <div className="pt-3 border-t border-border space-y-1">
              <label className="mb-1 block font-medium text-muted-foreground">
                {SLOT_LABELS.PRE_CATALOG} slugs
              </label>
              <input
                value={featuredSlugs}
                onChange={(e) => setFeaturedSlugs(e.target.value)}
                placeholder="product-slug-1, product-slug-2"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-mono text-foreground"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Comma-separated product slugs; leave empty to show first catalog items.
              </p>
            </div>
          )}

          {/* FOOTER CTA */}
          {footer?.type === 'FOOTER_CTA' && (
            <div className="pt-3 border-t border-border space-y-2">
              <label className="mb-1 block font-medium text-muted-foreground">
                {SLOT_LABELS.FOOTER} title
              </label>
              <input
                value={footer.title}
                onChange={(e) => patchBlock(footer.id, { title: e.target.value })}
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-medium text-foreground"
              />
              <textarea
                rows={2}
                value={footer.body}
                onChange={(e) => patchBlock(footer.id, { body: e.target.value })}
                placeholder="Footer consultation text"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 font-medium text-foreground"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 cursor-pointer"
          >
            Save Storefront & Deploy Live
          </button>
        </form>

        {/* Live Slot Preview Column */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 lg:col-span-6">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Eye className="h-4 w-4 text-indigo-500" />
              Live Storefront Preview
            </h3>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
              Interactive 1:1 View
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/80 bg-background shadow-inner">
            {ann?.type === 'ANNOUNCEMENT' && (
              <div
                className="px-3 py-2 text-center text-xs font-semibold shadow-sm"
                style={{
                  background: resolvedTheme.primaryColor,
                  color: resolvedTheme.onPrimaryColor ?? '#fff',
                }}
              >
                {ann.text}
              </div>
            )}

            {/* Hero Preview with Multi-Slide Carousel & Image Showcase */}
            {heroSlider?.type === 'HERO_SLIDER' ? (
              <div
                className="relative min-h-[300px] overflow-hidden p-6 sm:p-8 flex flex-col justify-center transition-all duration-500"
                style={{
                  ...storefrontThemeStyle(resolvedTheme),
                  background: resolvedTheme.heroGradient,
                  color: resolvedTheme.foregroundColor,
                }}
              >
                {/* Ambient Blurred Image Background */}
                {activeSlide?.imageUrl && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeSlide.imageUrl}
                      alt=""
                      className="h-full w-full object-cover opacity-20 filter blur-2xl scale-110"
                    />
                  </div>
                )}

                <div className="relative z-10 grid grid-cols-1 gap-6 sm:grid-cols-12 items-center">
                  {/* Left Column Content */}
                  <div className={`space-y-3 ${activeSlide?.imageUrl ? 'sm:col-span-7' : 'sm:col-span-12'}`}>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-0.5 text-[10px] font-bold text-rose-600 shadow-xs backdrop-blur dark:bg-black/60 dark:text-rose-400">
                      <Sparkles className="h-3 w-3 text-rose-500" />
                      <span>{activeSlide?.badge || 'ThePartyStore · Complete Party Solutions'}</span>
                    </div>

                    <h3
                      className="text-2xl sm:text-3xl font-black tracking-tight leading-tight"
                      style={{ color: resolvedTheme.foregroundColor }}
                    >
                      {activeSlide?.title || 'Make every party pop'}
                    </h3>

                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 line-clamp-3">
                      {activeSlide?.subtitle ||
                        'Balloons, themes, banners, candles and tableware for birthdays, baby showers and celebrations.'}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <span
                        className="inline-flex items-center rounded-full px-4 py-2 text-xs font-bold shadow-md"
                        style={{
                          background: resolvedTheme.primaryColor,
                          color: resolvedTheme.onPrimaryColor,
                        }}
                      >
                        {activeSlide?.ctaLabel || 'Browse catalog'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-zinc-900 shadow-xs backdrop-blur dark:bg-white/10 dark:text-white">
                        Browse All Products
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Visual Showcase Card */}
                  {activeSlide?.imageUrl && (
                    <div className="relative sm:col-span-5 flex justify-center">
                      <div className="w-full max-w-[200px] overflow-hidden rounded-2xl border-2 border-white/60 bg-white/40 p-2 shadow-xl backdrop-blur dark:border-white/10 dark:bg-black/40">
                        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-black/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeSlide.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white backdrop-blur-xs">
                            Featured Pack
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Slide Dots */}
                <div className="relative z-10 flex items-center gap-1.5 pt-4">
                  {heroSlider.slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveSlideIdx(i)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        i === activeSlideIdx ? 'w-5 bg-rose-500' : 'w-1.5 bg-zinc-400/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="space-y-2 p-6"
                style={{
                  ...storefrontThemeStyle(resolvedTheme),
                  background: resolvedTheme.heroGradient,
                  color: resolvedTheme.foregroundColor,
                }}
              >
                <span
                  className="text-[9px] font-semibold uppercase tracking-wider"
                  style={{ color: resolvedTheme.accentColor }}
                >
                  HERO
                </span>
                <h3 className="text-lg font-bold" style={{ color: resolvedTheme.foregroundColor }}>
                  {hero?.type === 'HERO' ? hero.title : 'Hero'}
                </h3>
                <p className="max-w-md text-[11px] leading-relaxed opacity-80">
                  {hero?.type === 'HERO' ? hero.subtitle : ''}
                </p>
              </div>
            )}

            {/* Kinetic Ticker Marquee in Preview */}
            {(resolvedTheme.interactiveFx === 'ticker' ||
              resolvedTheme.carouselEffect === 'kinetic-snap') && (
              <div className="overflow-hidden border-y border-black/10 bg-amber-400 py-1.5 text-[10px] font-black tracking-widest text-black">
                <div className="whitespace-nowrap px-4 font-mono">
                  {resolvedTheme.tickerText ||
                    '⚡ MEGA CELEBRATION SALE • 10% OFF ORDERS OVER LKR 5,000 • SAME DAY DISPATCH'}
                </div>
              </div>
            )}

            {mid && (
              <div
                className="border-t px-6 py-4"
                style={{
                  borderColor: resolvedTheme.borderColor,
                  background: resolvedTheme.mutedColor,
                }}
              >
                <p className="text-[9px] font-semibold uppercase text-muted-foreground">MID HIGHLIGHT</p>
                <p className="text-sm font-bold text-foreground">{mid.title}</p>
                {'body' in mid && <p className="text-xs text-muted-foreground mt-0.5">{mid.body}</p>}
              </div>
            )}

            {footer?.type === 'FOOTER_CTA' && (
              <div
                className="border-t px-6 py-4"
                style={{
                  borderColor: resolvedTheme.borderColor,
                  background: resolvedTheme.backgroundColor,
                }}
              >
                <p className="text-[9px] font-semibold uppercase text-muted-foreground">FOOTER CTA</p>
                <p className="text-sm font-bold text-foreground">{footer.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{footer.body}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MEDIA FOLDER MODAL */}
      <MediaFolderModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        selectedUrl={activeSlide?.imageUrl}
        onSelectMedia={(mediaItem: MediaAssetItem) => {
          if (heroSlider) {
            updateSlide(heroSlider.id, activeSlideIdx, { imageUrl: mediaItem.relativePath || mediaItem.url });
            setImageMetaMap((prev) => ({
              ...prev,
              [mediaItem.relativePath || mediaItem.url]: {
                sizeFormatted: mediaItem.sizeFormatted,
              },
            }));
          }
        }}
      />
    </div>
  );
}
