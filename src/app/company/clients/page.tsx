'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Database,
  Globe,
  Loader2,
  Plus,
  Save,
  Search,
  Server,
} from 'lucide-react';

const CLIENT_STATUSES = ['ALL', 'PROSPECT', 'DEMO', 'WON', 'PROVISIONING', 'LIVE', 'ON_HOLD', 'LOST'] as const;
const PROVISIONING_STATUSES = ['NOT_STARTED', 'PLANNED', 'IN_PROGRESS', 'READY', 'BLOCKED'] as const;
const HANDOVER_STATUSES = ['NOT_READY', 'IN_PROGRESS', 'READY', 'HANDED_OVER'] as const;
const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED'] as const;

type ClientStatus = (typeof CLIENT_STATUSES)[number];
type WorkStatus = (typeof PROVISIONING_STATUSES)[number];
type HandoverStatus = (typeof HANDOVER_STATUSES)[number];
type TaskStatus = (typeof TASK_STATUSES)[number];

type OnboardingTask = {
  id: string;
  clientId: string;
  taskKey: string;
  label: string;
  status: TaskStatus;
  owner: string;
  notes?: string;
  completedAt?: string | null;
};

type CompanyClient = {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  industry: string;
  branchCount: number;
  status: Exclude<ClientStatus, 'ALL'>;
  targetDomain?: string | null;
  coolifyAppName?: string | null;
  databaseName?: string | null;
  appStatus: WorkStatus;
  databaseStatus: WorkStatus;
  handoverStatus: HandoverStatus;
  verticalPreset: string;
  layoutTemplate: string;
  notes: string;
  nextAction?: string | null;
  targetLaunchAt?: string | null;
  createdAt: string;
  tasks: OnboardingTask[];
};

type ClientForm = {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  industry: string;
  branchCount: string;
  status: Exclude<ClientStatus, 'ALL'>;
  targetDomain: string;
  coolifyAppName: string;
  databaseName: string;
  appStatus: WorkStatus;
  databaseStatus: WorkStatus;
  handoverStatus: HandoverStatus;
  verticalPreset: string;
  layoutTemplate: string;
  notes: string;
  nextAction: string;
};

const emptyForm: ClientForm = {
  businessName: '',
  ownerName: '',
  phone: '',
  email: '',
  industry: 'General Retail',
  branchCount: '1',
  status: 'WON',
  targetDomain: '',
  coolifyAppName: '',
  databaseName: '',
  appStatus: 'NOT_STARTED',
  databaseStatus: 'NOT_STARTED',
  handoverStatus: 'NOT_READY',
  verticalPreset: 'general-retail',
  layoutTemplate: 'retail_wholesale',
  notes: '',
  nextAction: 'Create Coolify app and isolated database',
};

function statusText(value: string) {
  return value.replace(/_/g, ' ');
}

function badgeClass(value: string) {
  if (value === 'LIVE' || value === 'READY' || value === 'HANDED_OVER' || value === 'DONE') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }
  if (value === 'PROVISIONING' || value === 'IN_PROGRESS' || value === 'DEMO') {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  }
  if (value === 'BLOCKED' || value === 'LOST') return 'border-red-500/40 bg-red-500/10 text-red-300';
  if (value === 'WON' || value === 'PLANNED') return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  return 'border-border text-muted-foreground';
}

function formFromClient(client: CompanyClient): ClientForm {
  return {
    businessName: client.businessName || '',
    ownerName: client.ownerName || '',
    phone: client.phone || '',
    email: client.email || '',
    industry: client.industry || 'General Retail',
    branchCount: String(client.branchCount || 1),
    status: client.status || 'WON',
    targetDomain: client.targetDomain || '',
    coolifyAppName: client.coolifyAppName || '',
    databaseName: client.databaseName || '',
    appStatus: client.appStatus || 'NOT_STARTED',
    databaseStatus: client.databaseStatus || 'NOT_STARTED',
    handoverStatus: client.handoverStatus || 'NOT_READY',
    verticalPreset: client.verticalPreset || 'general-retail',
    layoutTemplate: client.layoutTemplate || 'retail_wholesale',
    notes: client.notes || '',
    nextAction: client.nextAction || '',
  };
}

export default function CompanyClientsPage() {
  const [clients, setClients] = useState<CompanyClient[]>([]);
  const [selected, setSelected] = useState<CompanyClient | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [status, setStatus] = useState<ClientStatus>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/company/admin/clients?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Load failed');
      setClients(data.clients || []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const next = new Map<string, number>();
    for (const s of CLIENT_STATUSES) next.set(s, 0);
    next.set('ALL', clients.length);
    for (const client of clients) next.set(client.status, (next.get(client.status) || 0) + 1);
    return next;
  }, [clients]);

  const checklist = selected?.tasks || [];
  const doneCount = checklist.filter((task) => task.status === 'DONE').length;
  const progress = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;

  const startNew = () => {
    setSelected(null);
    setForm(emptyForm);
    setMessage(null);
    setError(null);
  };

  const selectClient = (client: CompanyClient) => {
    setSelected(client);
    setForm(formFromClient(client));
    setMessage(null);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = { ...form, branchCount: Number(form.branchCount || 1) };
      const res = await fetch('/api/company/admin/clients', {
        method: selected ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected ? { id: selected.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSelected(data.client);
      setForm(formFromClient(data.client));
      setMessage(selected ? 'Client updated' : 'Client register created');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateTask = async (task: OnboardingTask, nextStatus: TaskStatus) => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/company/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selected.id, taskKey: task.taskKey, status: nextStatus, notes: task.notes || '' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Task update failed');
      const nextSelected = {
        ...selected,
        tasks: selected.tasks.map((item) => (item.taskKey === task.taskKey ? data.task : item)),
      };
      setSelected(nextSelected);
      setClients((prev) => prev.map((client) => (client.id === nextSelected.id ? nextSelected : client)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
            <Server className="h-6 w-6 text-emerald-400" />
            Client Provisioning
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Won clients, isolated app/database readiness, and handover checklist.</p>
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
            New Client
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
                placeholder="Search client, owner, email, or domain"
                className="min-h-11 w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CLIENT_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`min-h-9 rounded-lg border px-3 text-[11px] font-black transition ${
                    status === s ? 'border-emerald-400 text-emerald-300' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {statusText(s)} {counts.get(s) ? `(${counts.get(s)})` : ''}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          {message && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr] gap-3 border-b border-border px-4 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
              <span>Client</span>
              <span>Domain</span>
              <span>Status</span>
              <span>Readiness</span>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading clients...
                </div>
              ) : clients.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No client provisioning records yet.</div>
              ) : (
                clients.map((client) => {
                  const clientProgress = client.tasks.length
                    ? Math.round((client.tasks.filter((task) => task.status === 'DONE').length / client.tasks.length) * 100)
                    : 0;
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => selectClient(client)}
                      className={`grid w-full grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr] gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted/40 ${
                        selected?.id === client.id ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <span>
                        <span className="block font-bold">{client.businessName}</span>
                        <span className="block text-xs text-muted-foreground">{client.ownerName} · {client.industry}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{client.targetDomain || '-'}</span>
                      <span>
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${badgeClass(client.status)}`}>
                          {statusText(client.status)}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">{clientProgress}% checklist</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div>
            <h2 className="text-lg font-black">{selected ? 'Client Register' : 'New Client Register'}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Record the isolated app, database, vertical preset, and handover state.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Business Name
              <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block text-xs font-bold">
              Owner
              <input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block text-xs font-bold">
              Phone
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block text-xs font-bold">
              Email
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block text-xs font-bold">
              Industry
              <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block text-xs font-bold">
              Branch Count
              <input type="number" min="1" value={form.branchCount} onChange={(e) => setForm({ ...form, branchCount: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Client Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientForm['status'] })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500">
                {CLIENT_STATUSES.filter((s) => s !== 'ALL').map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold">
              Handover
              <select value={form.handoverStatus} onChange={(e) => setForm({ ...form, handoverStatus: e.target.value as HandoverStatus })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500">
                {HANDOVER_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold">
              App Status
              <select value={form.appStatus} onChange={(e) => setForm({ ...form, appStatus: e.target.value as WorkStatus })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500">
                {PROVISIONING_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold">
              DB Status
              <select value={form.databaseStatus} onChange={(e) => setForm({ ...form, databaseStatus: e.target.value as WorkStatus })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500">
                {PROVISIONING_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Target Domain
              <span className="relative mt-1 block">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={form.targetDomain} onChange={(e) => setForm({ ...form, targetDomain: e.target.value })} placeholder="client.grabberpoz.com" className="min-h-11 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
              </span>
            </label>
            <label className="block text-xs font-bold">
              Database Name
              <span className="relative mt-1 block">
                <Database className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={form.databaseName} onChange={(e) => setForm({ ...form, databaseName: e.target.value })} placeholder="postgres-client-name" className="min-h-11 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
              </span>
            </label>
            <label className="block text-xs font-bold">
              Vertical Preset
              <input value={form.verticalPreset} onChange={(e) => setForm({ ...form, verticalPreset: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block text-xs font-bold">
              Layout Template
              <input value={form.layoutTemplate} onChange={(e) => setForm({ ...form, layoutTemplate: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" />
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

          <button type="button" onClick={save} disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-black text-zinc-950 transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : selected ? 'Save Client' : 'Create Register'}
          </button>

          {selected && (
            <section className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black">Provisioning Checklist</h3>
                  <p className="text-xs text-muted-foreground">{doneCount}/{checklist.length} complete</p>
                </div>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-black text-emerald-300">{progress}%</span>
              </div>
              <div className="mt-3 space-y-2">
                {checklist.map((task) => (
                  <div key={task.taskKey} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{task.label}</p>
                        <p className="text-xs text-muted-foreground">{task.owner}</p>
                      </div>
                      <CheckCircle2 className={`h-4 w-4 ${task.status === 'DONE' ? 'text-emerald-300' : 'text-muted-foreground'}`} />
                    </div>
                    <select value={task.status} onChange={(e) => void updateTask(task, e.target.value as TaskStatus)} disabled={saving} className="mt-2 min-h-9 w-full rounded-lg border border-border bg-background px-2 text-xs font-bold outline-none focus:border-emerald-500">
                      {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
