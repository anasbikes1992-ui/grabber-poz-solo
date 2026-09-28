'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Cloud, Database, Globe, Loader2, Plus, Save, Search, Server } from 'lucide-react';

const DEPLOY_STATUSES = ['ALL', 'NOT_STARTED', 'QUEUED', 'BUILDING', 'DEPLOYING', 'LIVE', 'FAILED', 'ROLLED_BACK'] as const;
const WORK_STATUSES = ['NOT_STARTED', 'PLANNED', 'IN_PROGRESS', 'READY', 'BLOCKED'] as const;
const HEALTH_STATUSES = ['UNKNOWN', 'HEALTHY', 'DEGRADED', 'DOWN'] as const;

type DeployStatus = (typeof DEPLOY_STATUSES)[number];
type WorkStatus = (typeof WORK_STATUSES)[number];
type HealthStatus = (typeof HEALTH_STATUSES)[number];

type Deployment = {
  id: string;
  businessName: string;
  appName: string;
  environment: string;
  domain?: string | null;
  databaseName?: string | null;
  coolifyProjectId?: string | null;
  coolifyServiceId?: string | null;
  repository: string;
  branch: string;
  commitSha?: string | null;
  appStatus: WorkStatus;
  databaseStatus: WorkStatus;
  deployStatus: Exclude<DeployStatus, 'ALL'>;
  healthStatus: HealthStatus;
  notes: string;
  nextAction?: string | null;
  lastDeployedAt?: string | null;
  lastCheckedAt?: string | null;
};

type DeploymentForm = {
  businessName: string;
  appName: string;
  environment: string;
  domain: string;
  databaseName: string;
  coolifyProjectId: string;
  coolifyServiceId: string;
  repository: string;
  branch: string;
  commitSha: string;
  appStatus: WorkStatus;
  databaseStatus: WorkStatus;
  deployStatus: Exclude<DeployStatus, 'ALL'>;
  healthStatus: HealthStatus;
  notes: string;
  nextAction: string;
};

const emptyForm: DeploymentForm = {
  businessName: '',
  appName: '',
  environment: 'production',
  domain: '',
  databaseName: '',
  coolifyProjectId: '',
  coolifyServiceId: '',
  repository: 'anasbikes1992-ui/grabber-poz-solo',
  branch: 'main',
  commitSha: '',
  appStatus: 'NOT_STARTED',
  databaseStatus: 'NOT_STARTED',
  deployStatus: 'NOT_STARTED',
  healthStatus: 'UNKNOWN',
  notes: '',
  nextAction: 'Create app, database, env vars, and bootstrap',
};

function statusText(value: string) {
  return value.replace(/_/g, ' ');
}

function statusClass(value: string) {
  if (value === 'LIVE' || value === 'READY' || value === 'HEALTHY') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }
  if (value === 'BUILDING' || value === 'DEPLOYING' || value === 'IN_PROGRESS' || value === 'QUEUED') {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  }
  if (value === 'FAILED' || value === 'BLOCKED' || value === 'DOWN') {
    return 'border-red-500/40 bg-red-500/10 text-red-300';
  }
  if (value === 'DEGRADED' || value === 'PLANNED') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  }
  return 'border-border text-muted-foreground';
}

function formFromDeployment(deployment: Deployment): DeploymentForm {
  return {
    businessName: deployment.businessName || '',
    appName: deployment.appName || '',
    environment: deployment.environment || 'production',
    domain: deployment.domain || '',
    databaseName: deployment.databaseName || '',
    coolifyProjectId: deployment.coolifyProjectId || '',
    coolifyServiceId: deployment.coolifyServiceId || '',
    repository: deployment.repository || 'anasbikes1992-ui/grabber-poz-solo',
    branch: deployment.branch || 'main',
    commitSha: deployment.commitSha || '',
    appStatus: deployment.appStatus || 'NOT_STARTED',
    databaseStatus: deployment.databaseStatus || 'NOT_STARTED',
    deployStatus: deployment.deployStatus || 'NOT_STARTED',
    healthStatus: deployment.healthStatus || 'UNKNOWN',
    notes: deployment.notes || '',
    nextAction: deployment.nextAction || '',
  };
}

export default function CompanyDeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selected, setSelected] = useState<Deployment | null>(null);
  const [form, setForm] = useState<DeploymentForm>(emptyForm);
  const [status, setStatus] = useState<DeployStatus>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupRequired, setSetupRequired] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('deployStatus', status);
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/company/admin/deployments?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not load deployments');
      setDeployments(data.deployments || []);
      setSetupRequired(data.setupRequired ? data.setupMessage || 'Company deployment register table is not ready.' : null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load deployments');
      setSetupRequired(null);
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const next = new Map<string, number>();
    for (const item of DEPLOY_STATUSES) next.set(item, 0);
    next.set('ALL', deployments.length);
    for (const deployment of deployments) {
      next.set(deployment.deployStatus, (next.get(deployment.deployStatus) || 0) + 1);
    }
    return next;
  }, [deployments]);

  function startNew() {
    setSelected(null);
    setForm(emptyForm);
    setMessage(null);
    setError(null);
  }

  function selectDeployment(deployment: Deployment) {
    setSelected(deployment);
    setForm(formFromDeployment(deployment));
    setMessage(null);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = { ...form };
      const res = await fetch('/api/company/admin/deployments', {
        method: selected ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected ? { id: selected.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSelected(data.deployment);
      setForm(formFromDeployment(data.deployment));
      setMessage(selected ? 'Deployment updated' : 'Deployment registered');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
            <Cloud className="h-6 w-6 text-emerald-400" />
            Deployment Register
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Dedicated app, database, domain, deploy status, and handover readiness per company/client.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/company/roadmap" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-bold text-foreground transition hover:border-emerald-400 hover:text-emerald-200 active:scale-[0.98]">
            Roadmap
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={startNew}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-black text-zinc-950 transition hover:bg-emerald-400 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New Deployment
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search business, app, domain, database, or commit"
                className="min-h-11 w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {DEPLOY_STATUSES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={`min-h-9 rounded-lg border px-3 text-[11px] font-black transition ${
                    status === item ? 'border-emerald-400 text-emerald-300' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {statusText(item)} {counts.get(item) ? `(${counts.get(item)})` : ''}
                </button>
              ))}
            </div>
          </div>

          {setupRequired && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
              <p className="font-black">Deployment register schema is pending.</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/80">{setupRequired}</p>
            </div>
          )}
          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          {message && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.7fr] gap-3 border-b border-border px-4 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
              <span>Deployment</span>
              <span>Domain</span>
              <span>Status</span>
              <span>Health</span>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading deployments...
                </div>
              ) : deployments.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No deployment records yet.</div>
              ) : (
                deployments.map((deployment) => (
                  <button
                    key={deployment.id}
                    type="button"
                    onClick={() => selectDeployment(deployment)}
                    className={`grid w-full grid-cols-[1.1fr_0.8fr_0.8fr_0.7fr] gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted/40 ${
                      selected?.id === deployment.id ? 'bg-emerald-500/10' : ''
                    }`}
                  >
                    <span>
                      <span className="block font-bold">{deployment.businessName}</span>
                      <span className="block text-xs text-muted-foreground">{deployment.appName} - {deployment.databaseName || 'DB pending'}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{deployment.domain || '-'}</span>
                    <span>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusClass(deployment.deployStatus)}`}>
                        {statusText(deployment.deployStatus)}
                      </span>
                    </span>
                    <span>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusClass(deployment.healthStatus)}`}>
                        {statusText(deployment.healthStatus)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div>
            <h2 className="text-lg font-black">{selected ? 'Deployment Record' : 'New Deployment Record'}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Manual-first Coolify/app/database tracking. No deploy mutation is performed from here.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Business Name
              <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block text-xs font-bold">
              App Name
              <span className="relative mt-1 block">
                <Server className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })} className="min-h-11 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
              </span>
            </label>
            <label className="block text-xs font-bold">
              Domain
              <span className="relative mt-1 block">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="client.grabberpoz.com" className="min-h-11 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
              </span>
            </label>
            <label className="block text-xs font-bold">
              Database Name
              <span className="relative mt-1 block">
                <Database className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={form.databaseName} onChange={(e) => setForm({ ...form, databaseName: e.target.value })} placeholder="postgres-client-name" className="min-h-11 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
              </span>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Deploy Status
              <select value={form.deployStatus} onChange={(e) => setForm({ ...form, deployStatus: e.target.value as DeploymentForm['deployStatus'] })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500">
                {DEPLOY_STATUSES.filter((item) => item !== 'ALL').map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold">
              Health Status
              <select value={form.healthStatus} onChange={(e) => setForm({ ...form, healthStatus: e.target.value as HealthStatus })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500">
                {HEALTH_STATUSES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold">
              App Readiness
              <select value={form.appStatus} onChange={(e) => setForm({ ...form, appStatus: e.target.value as WorkStatus })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500">
                {WORK_STATUSES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold">
              DB Readiness
              <select value={form.databaseStatus} onChange={(e) => setForm({ ...form, databaseStatus: e.target.value as WorkStatus })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500">
                {WORK_STATUSES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Repository
              <input value={form.repository} onChange={(e) => setForm({ ...form, repository: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block text-xs font-bold">
              Branch
              <input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block text-xs font-bold">
              Commit SHA
              <input value={form.commitSha} onChange={(e) => setForm({ ...form, commitSha: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block text-xs font-bold">
              Environment
              <input value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Coolify Project ID
              <input value={form.coolifyProjectId} onChange={(e) => setForm({ ...form, coolifyProjectId: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block text-xs font-bold">
              Coolify Service ID
              <input value={form.coolifyServiceId} onChange={(e) => setForm({ ...form, coolifyServiceId: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
          </div>

          <label className="block text-xs font-bold">
            Next Action
            <input value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
          </label>
          <label className="block text-xs font-bold">
            Notes
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </label>

          <button type="button" onClick={save} disabled={saving || Boolean(setupRequired)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-black text-zinc-950 transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : selected ? 'Save Deployment' : 'Create Deployment'}
          </button>
        </aside>
      </div>
    </div>
  );
}
