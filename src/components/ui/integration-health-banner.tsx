'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Key,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import type { IntegrationHealthItem, IntegrationServiceId } from '@/app/api/integrations/health/route';

export function IntegrationHealthBanner({
  service,
  compact = false,
  className = '',
}: {
  service?: IntegrationServiceId | 'all';
  compact?: boolean;
  className?: string;
}) {
  const [services, setServices] = useState<IntegrationHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let unmounted = false;
    async function load() {
      try {
        const res = await fetch('/api/integrations/health');
        const data = await res.json();
        if (!unmounted && data.success && data.services) {
          setServices(data.services);
        }
      } catch {
        // non-blocking
      } finally {
        if (!unmounted) setLoading(false);
      }
    }
    load();
    return () => {
      unmounted = true;
    };
  }, []);

  if (loading || dismissed || services.length === 0) return null;

  const relevantServices =
    service && service !== 'all'
      ? services.filter((s) => s.id === service)
      : services.filter((s) => s.status !== 'LIVE');

  if (relevantServices.length === 0) return null;

  // Render single service banner
  if (service && service !== 'all') {
    const item = relevantServices[0];
    if (item.status === 'LIVE') return null;

    const isSim = item.status === 'SIMULATION';
    const isFallback = item.status === 'FALLBACK';

    return (
      <div
        className={`rounded-2xl border p-4 shadow-sm transition ${
          isSim
            ? 'border-amber-200 bg-amber-50/80 text-amber-900'
            : isFallback
            ? 'border-blue-200 bg-blue-50/80 text-blue-900'
            : 'border-rose-200 bg-rose-50/80 text-rose-900'
        } ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 rounded-xl p-2 ${
                isSim
                  ? 'bg-amber-100 text-amber-800'
                  : isFallback
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {isSim ? (
                <Sparkles className="h-4 w-4" />
              ) : isFallback ? (
                <Info className="h-4 w-4" />
              ) : (
                <Key className="h-4 w-4" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  {item.name}
                </h4>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border">
                  {item.status}
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {item.fallbackDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
            >
              Configure in Settings
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render multi-service summary banner (on Settings or Setup)
  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm text-amber-950 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-amber-200/60 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-amber-100 p-1.5 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <h4 className="text-sm font-bold text-amber-900">
            Integration Readiness & Credential Banners
          </h4>
        </div>
        <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-900">
          {relevantServices.length} {relevantServices.length === 1 ? 'Notice' : 'Notices'}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {relevantServices.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-amber-200/80 bg-white p-3 text-xs flex flex-col justify-between shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-bold text-slate-900">{item.name}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    item.status === 'FALLBACK'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal line-clamp-2">
                {item.fallbackDescription}
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-mono text-[10px]">Source: {item.source}</span>
              <Link
                href="/settings"
                className="font-semibold text-emerald-800 hover:underline inline-flex items-center gap-0.5"
              >
                Set Key →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
