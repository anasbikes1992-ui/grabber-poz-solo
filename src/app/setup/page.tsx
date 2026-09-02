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
  Target,
} from 'lucide-react';
import { VERTICAL_PRESETS, type VerticalPresetId } from '@/lib/config/vertical-presets';
import { POS_MODE_LABELS, PRODUCT_ITEM_TYPE_LABELS } from '@/lib/config/product-item-types';

type Milestone = {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
  required: boolean;
  order: number;
  action?: 'seed' | 'preset_seed' | 'link';
};

type ProgressPayload = {
  success?: boolean;
  milestones?: Milestone[];
  percent?: number;
  requiredCompleted?: number;
  requiredTotal?: number;
  nextMilestoneId?: string | null;
  preset?: VerticalPresetId | null;
  presetLabel?: string | null;
  seeded?: boolean;
  seededPreset?: string | null;
  dbConnected?: boolean;
};

export default function SetupPage() {
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [mobileRepairBusy, setMobileRepairBusy] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [presetMsg, setPresetMsg] = useState<string | null>(null);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<VerticalPresetId>('fashion');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup/progress');
      const data = (await res.json()) as ProgressPayload;
      if (data.success !== false) {
        setProgress(data);
        if (data.preset) setSelectedPreset(data.preset);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runSeed(preset?: VerticalPresetId) {
    const target = preset || progress?.preset || selectedPreset || 'fashion';
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: target, storeName: process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Solo Store' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Seed failed');
      setSeedMsg(
        `Loaded ${data.catalogCount ?? data.seeded?.products?.length ?? 0} catalog items for "${VERTICAL_PRESETS[target]?.label || target}". Open POS or storefront to verify.`,
      );
      await refresh();
    } catch (err) {
      setSeedMsg((err as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  async function runMobileRepairSetup() {
    setMobileRepairBusy(true);
    setSeedMsg(null);
    try {
      const seedRes = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: 'mobilerepair', storeName: 'MobileRepair Shop' }),
      });
      const seedData = await seedRes.json();
      if (!seedData.success) throw new Error(seedData.error || 'MobileRepair setup failed');
      setSeedMsg(
        `MobileRepair profile applied — ${seedData.mobilerepair?.catalogRows ?? seedData.catalogCount ?? 0} repair prices, phones: ${(seedData.mobilerepair?.productSlugs || []).join(', ')}. Open /shop/repairs/book`,
      );
      await refresh();
    } catch (err) {
      setSeedMsg((err as Error).message);
    } finally {
      setMobileRepairBusy(false);
    }
  }

  async function applyPreset(presetId: VerticalPresetId, andSeed = false) {
    setApplyingPreset(presetId);
    setPresetMsg(null);
    setSelectedPreset(presetId);
    try {
      const res = await fetch('/api/config/flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: presetId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Preset apply failed');
      setPresetMsg(`Applied "${VERTICAL_PRESETS[presetId].label}" — vertical modules updated.`);
      if (andSeed) {
        await runSeed(presetId);
      } else {
        await refresh();
      }
    } catch (err) {
      setPresetMsg((err as Error).message);
    } finally {
      setApplyingPreset(null);
    }
  }

  const milestones = progress?.milestones ?? [];
  const percent = progress?.percent ?? 0;
  const requiredCompleted = progress?.requiredCompleted ?? 0;
  const requiredTotal = progress?.requiredTotal ?? 4;
  const nextId = progress?.nextMilestoneId;
  const activePreset = progress?.preset ?? selectedPreset;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400">
          ← Merchant Hub
        </Link>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 mt-2">
          <Sparkles className="w-6 h-6 text-emerald-400" /> Guided onboarding
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          {loading
            ? 'Loading progress…'
            : `${requiredCompleted}/${requiredTotal} required milestones · ${percent}% ready for go-live`}
          {progress?.presetLabel ? ` · Preset: ${progress.presetLabel}` : ''}
        </p>
      </div>

      <div className="p-4 rounded-2xl glass-card border border-zinc-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-semibold">Milestone progress</span>
          <span className="text-emerald-400 font-bold">{percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        {nextId && (
          <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5 pt-1">
            <Target className="w-3.5 h-3.5 shrink-0" />
            Next: {milestones.find((m) => m.id === nextId)?.title ?? nextId}
          </p>
        )}
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
          One-click setup: vertical preset (repairs, HP, appointments), repair price catalog, iPhone & Samsung demo SKUs.
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

      <div id="presets" className="p-4 rounded-2xl glass-card border border-zinc-800 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" /> Business vertical
        </h2>
        <p className="text-xs text-zinc-400">
          Pick your business nature — apply flags, then seed a matching starter catalog. Fine-tune modules in Settings → Verticals.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(VERTICAL_PRESETS) as VerticalPresetId[]).map((id) => {
            const preset = VERTICAL_PRESETS[id];
            const isActive = activePreset === id;
            return (
              <div
                key={id}
                className={`text-left p-3 rounded-xl border ${
                  isActive ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-zinc-900/80 border-zinc-800'
                }`}
              >
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  {preset.label}
                  {isActive && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Active</span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{preset.description}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(preset.flags)
                    .filter(([, on]) => on)
                    .slice(0, 5)
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
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={Boolean(applyingPreset) || seeding}
                    onClick={() => void applyPreset(id, false)}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-[10px] font-bold disabled:opacity-50"
                  >
                    {applyingPreset === id ? 'Applying…' : 'Apply flags'}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(applyingPreset) || seeding}
                    onClick={() => void applyPreset(id, true)}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Database className="w-3 h-3" /> Apply & seed
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {milestones.map((step) => {
          const isNext = step.id === nextId && !step.done;
          return (
            <div
              key={step.id}
              className={`p-4 rounded-2xl glass-card border flex items-start justify-between gap-3 ${
                isNext ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-zinc-800'
              }`}
            >
              <div className="flex gap-3">
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className={`w-5 h-5 shrink-0 mt-0.5 ${isNext ? 'text-amber-400' : 'text-zinc-600'}`} />
                )}
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    {step.title}
                    {!step.required && (
                      <span className="text-[9px] font-normal text-zinc-500 uppercase tracking-wide">Optional</span>
                    )}
                    {isNext && (
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">Up next</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">{step.description}</div>
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {step.action === 'preset_seed' || step.action === 'seed' ? (
                  <button
                    type="button"
                    disabled={seeding || !progress?.dbConnected}
                    onClick={() => void runSeed(activePreset ?? 'fashion')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
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
          );
        })}
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
