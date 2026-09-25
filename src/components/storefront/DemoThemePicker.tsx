'use client';

import { useEffect, useMemo, useState } from 'react';
import { Palette, X } from 'lucide-react';
import type { StorefrontConfig, StorefrontLayoutTemplate } from '@/lib/config/storefront-config.shared';
import {
  STOREFRONT_LAYOUT_TEMPLATES,
  resolveStorefrontLayoutTemplate,
} from '@/lib/config/storefront-config.shared';
import { getStorefrontThemePreset, listStorefrontThemePresets } from '@/lib/storefront/theme-presets';

const STORAGE_KEY = 'grabber_demo_theme_preview';

function isDemoPickerEnabled() {
  if (process.env.NEXT_PUBLIC_DEMO_THEME_PICKER === '1') return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  return host === 'demo.grabberpoz.com' || params.get('demoPicker') === '1';
}

function readSavedChoice() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as {
      template?: string;
      preset?: string;
    } | null;
  } catch {
    return null;
  }
}

export function DemoThemePicker({
  cms,
  onChange,
}: {
  cms: StorefrontConfig;
  onChange: (next: StorefrontConfig) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const presets = useMemo(() => listStorefrontThemePresets(), []);
  const activeTemplate = resolveStorefrontLayoutTemplate(cms.layoutTemplate, cms.theme.presetId);
  const activePresetId = cms.theme.presetId || 'grabber';

  useEffect(() => {
    const shouldEnable = isDemoPickerEnabled();
    setEnabled(shouldEnable);
    if (!shouldEnable) return;

    const params = new URLSearchParams(window.location.search);
    const saved = readSavedChoice();
    const template = params.get('template') || saved?.template;
    const preset = params.get('preset') || saved?.preset;
    if (!template && !preset) return;

    const nextTemplate = resolveStorefrontLayoutTemplate(template, preset || cms.theme.presetId);
    const presetTheme = preset ? getStorefrontThemePreset(preset)?.theme : undefined;
    onChange({
      ...cms,
      layoutTemplate: nextTemplate,
      theme: presetTheme
        ? {
            ...presetTheme,
            storeName: cms.theme.storeName,
            logoUrl: cms.theme.logoUrl,
            whatsappNumber: cms.theme.whatsappNumber,
          }
        : cms.theme,
    });
    // Only hydrate from URL/storage once on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!enabled) return null;

  function applyChoice(template: StorefrontLayoutTemplate, presetId: string) {
    const preset = getStorefrontThemePreset(presetId);
    const next: StorefrontConfig = {
      ...cms,
      layoutTemplate: template,
      theme: preset
        ? {
            ...preset.theme,
            storeName: cms.theme.storeName,
            logoUrl: cms.theme.logoUrl,
            whatsappNumber: cms.theme.whatsappNumber,
          }
        : cms.theme,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ template, preset: presetId }));
    onChange(next);
  }

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 z-[70] max-w-[calc(100vw-1.5rem)] md:bottom-5">
      {open ? (
        <div className="w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface)] p-3 text-[var(--sf-on-surface)] shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[var(--sf-accent)]">
                <Palette className="h-4 w-4" aria-hidden />
                Demo preview
              </p>
              <p className="mt-1 text-xs text-[var(--sf-secondary)]">Switch industry layout and visual preset.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Hide demo preview controls"
              className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--sf-muted)]"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-[var(--sf-secondary)]">
            Layout template
          </label>
          <select
            value={activeTemplate}
            onChange={(e) => applyChoice(e.target.value as StorefrontLayoutTemplate, activePresetId)}
            className="mt-1 min-h-11 w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-background)] px-3 text-sm font-semibold text-[var(--sf-foreground)]"
          >
            {STOREFRONT_LAYOUT_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-[var(--sf-secondary)]">
            Visual preset
          </label>
          <select
            value={activePresetId}
            onChange={(e) => applyChoice(activeTemplate, e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-background)] px-3 text-sm font-semibold text-[var(--sf-foreground)]"
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[var(--sf-primary)] px-4 text-xs font-bold text-[var(--sf-on-primary)] shadow-xl"
        >
          <Palette className="h-4 w-4" aria-hidden />
          Demo preview
        </button>
      )}
    </div>
  );
}
