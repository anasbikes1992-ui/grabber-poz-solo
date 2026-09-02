'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Database,
  MessageSquare,
  Settings,
  Sparkles,
  Store,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { VERTICAL_PRESETS, type VerticalPresetId } from '@/lib/config/vertical-presets';
import { POS_MODE_LABELS, PRODUCT_ITEM_TYPE_LABELS } from '@/lib/config/product-item-types';

type Step = {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
};

export default function SetupPage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [mobileRepairBusy, setMobileRepairBusy] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [presetMsg, setPresetMsg] = useState<string | null>(null);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [healthRes, bizRes] = await Promise.all([
      fetch('/api/health'),
      fetch('/api/settings/business'),
    ]);
    const health = (await healthRes.json()) as { db?: string };
    const biz = (await bizRes.json()) as { success?: boolean; profile?: { name?: string } };

    const dbOk = health.db === 'connected';
    const profileOk = Boolean(biz.success && biz.profile?.name?.trim());

    setSteps([
      {
        id: 'db',
        title: 'Connect database',
        description: dbOk ? 'DATABASE_URL is connected on Vercel.' : 'Add pooler DATABASE_URL on Vercel and redeploy.',
        href: '/api/health',
        done: dbOk,
      },
      {
        id: 'seed',
        title: 'Seed demo catalog',
        description: 'Load sample products, branches, and chart of accounts.',
        href: '/api/seed',
        done: dbOk,
      },
      {
        id: 'profile',
        title: 'Business profile',
        description: 'Store name, receipt header, currency, timezone.',
        href: '/settings',
        done: profileOk,
      },
      {
        id: 'integrations',
        title: 'WhatsApp & payments',
        description:
          'Set NEXT_PUBLIC_WHATSAPP_NUMBER, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN. Meta webhook: /api/whatsapp/webhook — subscribe messages field.',
        href: '/whatsapp',
        done: false,
      },
      {
        id: 'storefront',
        title: 'Storefront CMS',
        description: 'Hero, banners, theme tokens, featured products.',
        href: '/store/builder',
        done: false,
      },
      {
        id: 'automation',
        title: 'Automation rules',
        description: 'Order WhatsApp, low stock alerts, repair ready.',
        href: '/settings/automation',
        done: false,
      },
    ]);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runMobileRepairSetup() {
    setMobileRepairBusy(true);
    setSeedMsg(null);
    try {
      const seedRes = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: 'mobilerepair', storeName: 'MobileRepair Shop' }),
      });
      const seedData = await seedRes.json();
      if (!seedData.success) throw new Error(seedData.error || 'MobileRepair setup failed');
      setSeedMsg(
        `MobileRepair profile applied — ${seedData.mobilerepair?.catalogRows ?? 0} repair prices, phones: ${(seedData.mobilerepair?.productSlugs || []).join(', ')}. Open /shop/repairs/book`,
      );
      await refresh();
    } catch (err) {
      setSeedMsg((err as Error).message);
    } finally {
      setMobileRepairBusy(false);
    }
  }

  async function runSeed() {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Seed failed');
      setSeedMsg('Demo data loaded. Open POS or storefront to verify.');
      await refresh();
    } catch (err) {
      setSeedMsg((err as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  async function applyPreset(presetId: VerticalPresetId) {
    setApplyingPreset(presetId);
    setPresetMsg(null);
    try {
      const res = await fetch('/api/config/flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: presetId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Preset apply failed');
      setPresetMsg(`Applied "${VERTICAL_PRESETS[presetId].label}" — vertical modules updated.`);
    } catch (err) {
      setPresetMsg((err as Error).message);
    } finally {
      setApplyingPreset(null);
    }
  }

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400">
          ← Merchant Hub
        </Link>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 mt-2">
          <Sparkles className="w-6 h-6 text-emerald-400" /> Setup checklist
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          {doneCount}/{steps.length} core steps complete — finish onboarding before go-live.
        </p>
      </div>

      {seedMsg && (
        <p className="text-xs text-amber-400 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          {seedMsg}
        </p>
      )}

      {presetMsg && (
        <p className="text-xs text-emerald-400 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          {presetMsg}
        </p>
      )}

      <div className="p-4 rounded-2xl glass-card border border-emerald-500/30 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Store className="w-4 h-4 text-emerald-400" /> MobileRepair shop profile
        </h2>
        <p className="text-xs text-zinc-400">
          One-click setup: vertical preset (repairs, HP, appointments), repair price catalog, iPhone & Samsung demo SKUs with storage/condition/warranty variants.
        </p>
        <button
          type="button"
          disabled={mobileRepairBusy || seeding}
          onClick={() => void runMobileRepairSetup()}
          className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50"
        >
          {mobileRepairBusy ? 'Setting up MobileRepair…' : 'Complete MobileRepair setup'}
        </button>
      </div>

      <div className="p-4 rounded-2xl glass-card border border-zinc-800 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" /> Vertical preset
        </h2>
        <p className="text-xs text-zinc-400">
          Hybrid presets + composable module flags. Pick your business nature — fine-tune individual modules in Settings → Verticals.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(VERTICAL_PRESETS) as VerticalPresetId[]).map((id) => {
            const preset = VERTICAL_PRESETS[id];
            return (
            <button
              key={id}
              type="button"
              disabled={Boolean(applyingPreset)}
              onClick={() => void applyPreset(id)}
              className="text-left p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/40 disabled:opacity-50"
            >
              <div className="font-bold text-white text-xs">{preset.label}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{preset.description}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(preset.flags)
                  .filter(([, on]) => on)
                  .map(([key]) => (
                    <span key={key} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                      {key}
                    </span>
                  ))}
              </div>
              <p className="text-[9px] text-zinc-600 mt-2 line-clamp-2">
                Items: {preset.itemTypes.map((t) => PRODUCT_ITEM_TYPE_LABELS[t].split(' ')[0]).join(', ')} · POS:{' '}
                {preset.posModes.map((m) => POS_MODE_LABELS[m].split(' ')[0]).join(', ')}
              </p>
              {applyingPreset === id && <div className="text-[10px] text-emerald-400 mt-1">Applying…</div>}
            </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className="p-4 rounded-2xl glass-card border border-zinc-800 flex items-start justify-between gap-3"
          >
            <div className="flex gap-3">
              {step.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-white">{step.title}</div>
                <div className="text-xs text-zinc-400 mt-0.5">{step.description}</div>
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {step.id === 'seed' ? (
                <button
                  type="button"
                  disabled={seeding}
                  onClick={() => void runSeed()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-bold flex items-center gap-1"
                >
                  <Database className="w-3 h-3" /> {seeding ? 'Seeding…' : 'Run seed'}
                </button>
              ) : (
                <Link
                  href={step.href}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-[11px] font-bold flex items-center gap-1"
                >
                  Open <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <Link href="/settings" className="p-4 rounded-2xl glass-card border border-zinc-800 hover:border-emerald-500/30">
          <Settings className="w-4 h-4 text-emerald-400 mb-2" />
          <div className="font-bold text-white">Settings</div>
          <div className="text-zinc-500 mt-1">Profile & integrations</div>
        </Link>
        <Link href="/store/builder" className="p-4 rounded-2xl glass-card border border-zinc-800 hover:border-emerald-500/30">
          <Store className="w-4 h-4 text-emerald-400 mb-2" />
          <div className="font-bold text-white">Store builder</div>
          <div className="text-zinc-500 mt-1">Homepage CMS</div>
        </Link>
        <Link href="/settings/automation" className="p-4 rounded-2xl glass-card border border-zinc-800 hover:border-emerald-500/30">
          <MessageSquare className="w-4 h-4 text-emerald-400 mb-2" />
          <div className="font-bold text-white">Automation</div>
          <div className="text-zinc-500 mt-1">WhatsApp rules</div>
        </Link>
      </div>
    </div>
  );
}
