'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, Database, RefreshCw, Search, ShieldCheck } from 'lucide-react';

type AuditRow = {
  id: string;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  riskLevel: string;
  ipAddress?: string | null;
  createdAt: string;
};

const riskOptions = ['ALL', 'READ', 'DRAFT', 'LOW_RISK_WRITE', 'HIGH_RISK_WRITE', 'DESTRUCTIVE'];

export default function CompanyAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');
  const [risk, setRisk] = useState('ALL');
  const [entity, setEntity] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const entities = useMemo(() => {
    const values = Array.from(new Set(rows.map((row) => row.entity).filter(Boolean))).sort();
    return ['ALL', ...values];
  }, [rows]);

  async function loadAudit() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (risk !== 'ALL') params.set('risk', risk);
    if (entity !== 'ALL') params.set('entity', entity);
    params.set('limit', '150');

    try {
      const res = await fetch(`/api/company/admin/audit?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unable to load audit logs');
      setRows(data.auditLogs || []);
      setStats(data.stats || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risk, entity]);

  return (
    <div className="max-w-7xl space-y-5">
      <section className="rounded-lg border border-border bg-card/90 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Owner / Admin</p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-black tracking-tight">
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
              Company Audit Trail
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Read-only action history for company admin, staff, stock, commerce, and agent actions recorded in `audit_logs`.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAudit()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-500/40 px-4 text-sm font-black text-emerald-200 transition duration-200 hover:border-emerald-300 hover:bg-emerald-500/10 active:scale-[0.98]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {riskOptions.filter((item) => item !== 'ALL').map((item) => (
          <div key={item} className="rounded-lg border border-border bg-card p-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">{item.replaceAll('_', ' ')}</p>
            <p className="mt-2 text-2xl font-black tabular-nums">{stats[item] || 0}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <label className="relative block">
            <span className="sr-only">Search audit logs</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void loadAudit();
              }}
              placeholder="Search action, entity, role, or id"
              className="min-h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500"
            aria-label="Filter by risk"
          >
            {riskOptions.map((item) => (
              <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>
            ))}
          </select>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500"
            aria-label="Filter by entity"
          >
            {entities.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadAudit()}
            className="min-h-11 rounded-lg bg-emerald-500 px-5 text-sm font-black text-zinc-950 transition duration-200 hover:bg-emerald-400 active:scale-[0.98]"
          >
            Apply
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr] border-b border-border px-4 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
          <span>Action</span>
          <span>Entity</span>
          <span>Actor</span>
          <span>Created</span>
        </div>
        {error && <div className="p-5 text-sm text-rose-300">{error}</div>}
        {!error && loading && <div className="p-5 text-sm text-muted-foreground">Loading audit trail...</div>}
        {!error && !loading && rows.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No audit entries found.</div>
        )}
        {!error && !loading && rows.map((row) => (
          <article key={row.id} className="grid grid-cols-1 gap-3 border-b border-border px-4 py-3 text-sm last:border-0 lg:grid-cols-[1.1fr_1fr_1fr_0.8fr]">
            <div>
              <p className="font-black">{row.action}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.riskLevel.replaceAll('_', ' ')}</p>
            </div>
            <div>
              <p className="font-bold">{row.entity}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{row.entityId || 'No entity id'}</p>
            </div>
            <div>
              <p className="flex items-center gap-2 font-bold">
                <Database className="h-4 w-4 text-emerald-300" />
                {row.actorRole || 'SYSTEM'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{row.ipAddress || 'No IP captured'}</p>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Clock className="mt-0.5 h-4 w-4 text-emerald-300" />
              {new Date(row.createdAt).toLocaleString()}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
