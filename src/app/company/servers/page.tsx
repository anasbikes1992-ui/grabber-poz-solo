'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, DatabaseBackup, HardDrive, Loader2, Plus, Save, Search, Server } from 'lucide-react';

const HEALTH_STATUSES = ['ALL', 'UNKNOWN', 'HEALTHY', 'DEGRADED', 'DOWN'] as const;
const RAM_PRESSURES = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'] as const;
const BACKUP_STATUSES = ['UNKNOWN', 'OK', 'STALE', 'FAILED', 'MISSING'] as const;

type HealthStatus = (typeof HEALTH_STATUSES)[number];
type ServerHealthStatus = Exclude<HealthStatus, 'ALL'>;
type RamPressure = (typeof RAM_PRESSURES)[number];
type BackupStatus = (typeof BACKUP_STATUSES)[number];

type FleetServer = {
  id: string;
  name: string;
  provider: string;
  region: string;
  publicIp?: string | null;
  hostname?: string | null;
  coolifyUrl?: string | null;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  maxClients: number;
  assignedClients: number;
  liveClients: number;
  unhealthyClients: number;
  capacityStatus: 'HEALTHY' | 'WARNING' | 'FULL' | 'BLOCKED';
  capacityLabel: string;
  canAssignClient: boolean;
  capacityNextAction: string;
  healthStatus: ServerHealthStatus;
  diskUsagePercent: number;
  ramPressure: RamPressure;
  backupStatus: BackupStatus;
  notes: string;
  nextAction?: string | null;
  lastHeartbeatAt?: string | null;
};

type Summary = {
  totalServers: number;
  totalCapacity: number;
  assignedClients: number;
  availableSlots: number;
  assignableServers: number;
  blockedServers: number;
};

type ServerForm = {
  name: string;
  provider: string;
  region: string;
  publicIp: string;
  hostname: string;
  coolifyUrl: string;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  maxClients: number;
  healthStatus: ServerHealthStatus;
  diskUsagePercent: number;
  ramPressure: RamPressure;
  backupStatus: BackupStatus;
  notes: string;
  nextAction: string;
};

const emptyForm: ServerForm = {
  name: '',
  provider: 'Contabo',
  region: 'Sri Lanka / APAC',
  publicIp: '',
  hostname: '',
  coolifyUrl: '',
  cpuCores: 4,
  ramGb: 8,
  diskGb: 160,
  maxClients: 5,
  healthStatus: 'UNKNOWN',
  diskUsagePercent: 0,
  ramPressure: 'UNKNOWN',
  backupStatus: 'UNKNOWN',
  notes: '',
  nextAction: 'Create Coolify apps and private Postgres resources manually.',
};

function statusText(value: string) {
  return value.replace(/_/g, ' ');
}

function statusClass(value: string) {
  if (['HEALTHY', 'OK'].includes(value)) return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  if (['WARNING', 'DEGRADED', 'STALE', 'MEDIUM'].includes(value)) return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  if (['FULL', 'BLOCKED', 'DOWN', 'FAILED', 'MISSING', 'HIGH'].includes(value)) return 'border-red-500/40 bg-red-500/10 text-red-300';
  return 'border-border text-muted-foreground';
}

function formFromServer(server: FleetServer): ServerForm {
  return {
    name: server.name || '',
    provider: server.provider || 'Contabo',
    region: server.region || 'Sri Lanka / APAC',
    publicIp: server.publicIp || '',
    hostname: server.hostname || '',
    coolifyUrl: server.coolifyUrl || '',
    cpuCores: server.cpuCores || 4,
    ramGb: server.ramGb || 8,
    diskGb: server.diskGb || 160,
    maxClients: server.maxClients || 5,
    healthStatus: server.healthStatus || 'UNKNOWN',
    diskUsagePercent: server.diskUsagePercent || 0,
    ramPressure: server.ramPressure || 'UNKNOWN',
    backupStatus: server.backupStatus || 'UNKNOWN',
    notes: server.notes || '',
    nextAction: server.nextAction || server.capacityNextAction || '',
  };
}

export default function CompanyServersPage() {
  const [servers, setServers] = useState<FleetServer[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<FleetServer | null>(null);
  const [form, setForm] = useState<ServerForm>(emptyForm);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [setupRequired, setSetupRequired] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (healthStatus !== 'ALL') params.set('healthStatus', healthStatus);
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/company/admin/servers?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not load servers');
      setServers(data.servers || []);
      setSummary(data.summary || null);
      setSetupRequired(data.setupRequired ? data.setupMessage || 'Company server fleet schema is not ready.' : null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load servers');
      setSetupRequired(null);
    } finally {
      setLoading(false);
    }
  }, [healthStatus, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedServers = useMemo(() => {
    return [...servers].sort((a, b) => Number(b.canAssignClient) - Number(a.canAssignClient) || a.assignedClients - b.assignedClients);
  }, [servers]);

  async function remove() {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/company/admin/servers?id=${encodeURIComponent(selected.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Delete failed');
      setSelected(null);
      setForm(emptyForm);
      setMessage('Server deleted');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setConfirmDelete(false);
      setSaving(false);
    }
  }

  function startNew() {
    setConfirmDelete(false);
    setSelected(null);
    setForm(emptyForm);
    setMessage(null);
    setError(null);
  }

  function selectServer(server: FleetServer) {
    setConfirmDelete(false);
    setSelected(server);
    setForm(formFromServer(server));
    setMessage(null);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = { ...form };
      const res = await fetch('/api/company/admin/servers', {
        method: selected ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected ? { id: selected.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSelected(data.server);
      setForm(formFromServer(data.server));
      setMessage(selected ? 'Server updated' : 'Server registered');
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
            <Server className="h-6 w-6 text-emerald-400" />
            Server Fleet Registry
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Control-plane capacity tracking for isolated Coolify servers, apps, and databases.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/company/deployments" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-bold text-foreground transition hover:border-emerald-400 hover:text-emerald-200 active:scale-[0.98]">
            Deployments
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button type="button" onClick={startNew} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-black text-zinc-950 transition hover:bg-emerald-400 active:scale-95">
            <Plus className="h-4 w-4" />
            New Server
          </button>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-5">
        {[
          ['Servers', summary?.totalServers ?? 0],
          ['Assigned', summary?.assignedClients ?? 0],
          ['Capacity', summary?.totalCapacity ?? 0],
          ['Open Slots', summary?.availableSlots ?? 0],
          ['Assignable', summary?.assignableServers ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search server, provider, region, IP, or hostname" className="min-h-11 w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
            </div>
            <div className="flex flex-wrap gap-2">
              {HEALTH_STATUSES.map((item) => (
                <button key={item} type="button" onClick={() => setHealthStatus(item)} className={`min-h-9 rounded-lg border px-3 text-[11px] font-black transition ${healthStatus === item ? 'border-emerald-400 text-emerald-300' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  {statusText(item)}
                </button>
              ))}
            </div>
          </div>

          {setupRequired && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
              <p className="font-black">Server fleet schema is pending.</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/80">{setupRequired}</p>
            </div>
          )}
          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          {message && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="grid grid-cols-[1.1fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-border px-4 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
              <span>Server</span>
              <span>Clients</span>
              <span>Disk</span>
              <span>Capacity</span>
              <span>Health</span>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading servers...
                </div>
              ) : sortedServers.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No server records yet.</div>
              ) : (
                sortedServers.map((server) => (
                  <button key={server.id} type="button" onClick={() => selectServer(server)} className={`grid w-full grid-cols-[1.1fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted/40 ${selected?.id === server.id ? 'bg-emerald-500/10' : ''}`}>
                    <span>
                      <span className="block font-bold">{server.name}</span>
                      <span className="block text-xs text-muted-foreground">{server.provider} - {server.publicIp || server.hostname || 'IP pending'}</span>
                    </span>
                    <span className="font-bold">{server.assignedClients}/{server.maxClients}</span>
                    <span className="text-xs text-muted-foreground">{server.diskUsagePercent}%</span>
                    <span><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusClass(server.capacityStatus)}`}>{server.capacityLabel}</span></span>
                    <span><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusClass(server.healthStatus)}`}>{statusText(server.healthStatus)}</span></span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div>
            <h2 className="text-lg font-black">{selected ? 'Server Record' : 'New Server Record'}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Track capacity only. Client data remains inside each isolated tenant DB.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold">Server Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="vps-lk-01" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" /></label>
            <label className="block text-xs font-bold">Provider<input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" /></label>
            <label className="block text-xs font-bold">Region<input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" /></label>
            <label className="block text-xs font-bold">Public IP<input value={form.publicIp} onChange={(e) => setForm({ ...form, publicIp: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" /></label>
            <label className="block text-xs font-bold">Hostname<input value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" /></label>
            <label className="block text-xs font-bold">Coolify URL<input value={form.coolifyUrl} onChange={(e) => setForm({ ...form, coolifyUrl: e.target.value })} placeholder="https://coolify-vps-01.grabberpoz.com" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" /></label>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block text-xs font-bold">CPU<input type="number" min={1} value={form.cpuCores} onChange={(e) => setForm({ ...form, cpuCores: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" /></label>
            <label className="block text-xs font-bold">RAM GB<input type="number" min={1} value={form.ramGb} onChange={(e) => setForm({ ...form, ramGb: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" /></label>
            <label className="block text-xs font-bold">Disk GB<input type="number" min={10} value={form.diskGb} onChange={(e) => setForm({ ...form, diskGb: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" /></label>
            <label className="block text-xs font-bold">Max Clients<input type="number" min={1} value={form.maxClients} onChange={(e) => setForm({ ...form, maxClients: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" /></label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold">Health<select value={form.healthStatus} onChange={(e) => setForm({ ...form, healthStatus: e.target.value as ServerHealthStatus })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500">{HEALTH_STATUSES.filter((item) => item !== 'ALL').map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="block text-xs font-bold">RAM Pressure<select value={form.ramPressure} onChange={(e) => setForm({ ...form, ramPressure: e.target.value as RamPressure })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500">{RAM_PRESSURES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="block text-xs font-bold">Backup<select value={form.backupStatus} onChange={(e) => setForm({ ...form, backupStatus: e.target.value as BackupStatus })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500">{BACKUP_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="block text-xs font-bold">Disk Usage<input type="number" min={0} max={100} value={form.diskUsagePercent} onChange={(e) => setForm({ ...form, diskUsagePercent: Number(e.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" /></label>
          </div>

          {selected && (
            <div className="grid gap-3 rounded-lg border border-border bg-background/40 p-3 text-sm sm:grid-cols-3">
              <div><Activity className="mb-2 h-4 w-4 text-emerald-300" /><p className="text-xs text-muted-foreground">Assigned</p><p className="font-black">{selected.assignedClients}/{selected.maxClients}</p></div>
              <div><HardDrive className="mb-2 h-4 w-4 text-amber-300" /><p className="text-xs text-muted-foreground">Disk</p><p className="font-black">{selected.diskUsagePercent}%</p></div>
              <div><DatabaseBackup className="mb-2 h-4 w-4 text-sky-300" /><p className="text-xs text-muted-foreground">Backup</p><p className="font-black">{statusText(selected.backupStatus)}</p></div>
            </div>
          )}

          <label className="block text-xs font-bold">Next Action<input value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" /></label>
          <label className="block text-xs font-bold">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500" /></label>

          <button type="button" onClick={save} disabled={saving || Boolean(setupRequired)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-black text-zinc-950 transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : selected ? 'Save Server' : 'Create Server'}
          </button>

          {selected && selected.assignedClients === 0 && (
            confirmDelete ? (
              <div className="flex gap-2">
                <button type="button" onClick={remove} disabled={saving} className="min-h-11 flex-1 rounded-lg bg-red-500 px-4 text-sm font-black text-white transition hover:bg-red-400 disabled:opacity-60">Confirm delete</button>
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={saving} className="min-h-11 flex-1 rounded-lg border border-border px-4 text-sm font-bold">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} disabled={saving} className="min-h-11 w-full rounded-lg border border-red-500/40 px-4 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-60">Delete server</button>
            )
          )}
        </aside>
      </div>
    </div>
  );
}
