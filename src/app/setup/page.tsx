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
} from 'lucide-react';

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
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

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
        description: 'Verify token, phone ID, PayHere keys.',
        href: '/settings',
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
