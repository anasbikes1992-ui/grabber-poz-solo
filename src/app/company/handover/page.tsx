'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Loader2,
  RefreshCw,
  Server,
} from 'lucide-react';

type HandoverGrade = 'READY' | 'NEEDS_REVIEW' | 'BLOCKED';

type HandoverItem = {
  clientId: string;
  businessName: string;
  ownerName: string;
  targetDomain: string | null;
  databaseName: string | null;
  verticalPreset: string;
  layoutTemplate: string;
  checklistTotal: number;
  checklistDone: number;
  checklistBlocked: number;
  checklistPercent: number;
  ready: boolean;
  grade: HandoverGrade;
  blockers: string[];
  nextAction: string;
  deployment: {
    deployStatus: string;
    healthStatus: string;
    commitSha: string | null;
    lastDeployedAt: string | null;
    lastCheckedAt: string | null;
  } | null;
};

type HandoverResponse = {
  success: boolean;
  setupRequired?: boolean;
  setupMessage?: string;
  summary: { total: number; ready: number; needsReview: number; blocked: number };
  handovers: HandoverItem[];
  error?: string;
};

const gradeClass: Record<HandoverGrade, string> = {
  READY: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  NEEDS_REVIEW: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  BLOCKED: 'border-red-500/40 bg-red-500/10 text-red-300',
};

function formatGrade(value: string) {
  return value.replace(/_/g, ' ');
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function CompanyHandoverPage() {
  const [data, setData] = useState<HandoverResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company/admin/handover', { cache: 'no-store' });
      const json = (await res.json()) as HandoverResponse;
      if (!json.success) throw new Error(json.error || 'Could not load handover readiness');
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load handover readiness');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handovers = data?.handovers || [];
  const sorted = useMemo(() => {
    const order: Record<HandoverGrade, number> = { BLOCKED: 0, NEEDS_REVIEW: 1, READY: 2 };
    return [...handovers].sort((a, b) => order[a.grade] - order[b.grade] || a.businessName.localeCompare(b.businessName));
  }, [handovers]);

  return (
    <div className="max-w-6xl space-y-5">
      <section className="rounded-lg border border-border bg-card/90 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Client Handover</p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-black tracking-tight">
              <ClipboardCheck className="h-6 w-6 text-emerald-300" />
              Handover Readiness
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              One place to confirm each client has a dedicated app, isolated database, deployment health, smoke test, and SOP checklist before handover.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-bold transition hover:border-emerald-400 hover:text-emerald-200 active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading handover readiness...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      ) : (
        <>
          {data?.setupRequired && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="font-black">Company handover schema is pending.</p>
              <p className="mt-1 text-xs text-amber-100/80">{data.setupMessage}</p>
            </div>
          )}

          <section className="grid gap-3 md:grid-cols-4">
            {[
              ['Total Clients', data?.summary.total || 0, 'border-border text-foreground'],
              ['Ready', data?.summary.ready || 0, 'border-emerald-500/30 text-emerald-300'],
              ['Needs Review', data?.summary.needsReview || 0, 'border-amber-500/30 text-amber-300'],
              ['Blocked', data?.summary.blocked || 0, 'border-red-500/30 text-red-300'],
            ].map(([label, value, tone]) => (
              <article key={label} className={`rounded-lg border bg-card p-4 ${tone}`}>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4">
            {sorted.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No client provisioning records yet. Create one from Client Provisioning.
              </div>
            ) : (
              sorted.map((item) => (
                <article key={item.clientId} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black">{item.businessName}</h2>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${gradeClass[item.grade]}`}>
                          {formatGrade(item.grade)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.ownerName} / {item.verticalPreset} / {item.layoutTemplate}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/company/clients`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold transition hover:border-emerald-400 hover:text-emerald-200">
                        <Server className="h-4 w-4" />
                        Client Register
                      </Link>
                      <Link href="/company/deployments" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold transition hover:border-emerald-400 hover:text-emerald-200">
                        <Database className="h-4 w-4" />
                        Deployments
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
                    <div className="rounded-lg border border-border bg-background/40 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Checklist</p>
                      <p className="mt-2 text-2xl font-black">{item.checklistPercent}%</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.checklistDone}/{item.checklistTotal} tasks complete
                      </p>
                      {item.checklistBlocked > 0 && <p className="mt-2 text-xs font-bold text-red-300">{item.checklistBlocked} blocked</p>}
                    </div>

                    <div className="rounded-lg border border-border bg-background/40 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Blockers / Next Action</p>
                      {item.blockers.length === 0 ? (
                        <p className="mt-3 flex items-center gap-2 text-sm font-bold text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          Ready for supervised handover.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {item.blockers.slice(0, 5).map((blocker) => (
                            <li key={blocker} className="flex gap-2 text-sm text-muted-foreground">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                              {blocker}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-3 text-xs font-bold text-foreground">Next: {item.nextAction}</p>
                    </div>

                    <div className="rounded-lg border border-border bg-background/40 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Deployment</p>
                      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                        <p>Domain: <span className="font-bold text-foreground">{item.targetDomain || '-'}</span></p>
                        <p>DB: <span className="font-bold text-foreground">{item.databaseName || '-'}</span></p>
                        <p>Deploy: <span className="font-bold text-foreground">{item.deployment?.deployStatus || '-'}</span></p>
                        <p>Health: <span className="font-bold text-foreground">{item.deployment?.healthStatus || '-'}</span></p>
                        <p>Commit: <span className="font-bold text-foreground">{item.deployment?.commitSha?.slice(0, 12) || '-'}</span></p>
                        <p>Checked: <span className="font-bold text-foreground">{formatDate(item.deployment?.lastCheckedAt || null)}</span></p>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-300">SOP</p>
            <h2 className="mt-1 text-lg font-black">Minimum handover gate</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {['Isolated app and DB ready', 'Latest deployment live and healthy', 'POS/storefront smoke complete', 'Backup, credentials, and SOP handed over'].map((item) => (
                <div key={item} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background/40 px-3 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
            <Link href="/company/roadmap" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-emerald-300 hover:text-emerald-200">
              Open roadmap
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
