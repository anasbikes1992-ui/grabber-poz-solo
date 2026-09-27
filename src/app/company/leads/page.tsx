'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Briefcase, CalendarClock, Mail, Phone, Plus, Save, Search, UserRound } from 'lucide-react';

const STATUSES = ['ALL', 'NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST', 'ARCHIVED'] as const;
type Status = (typeof STATUSES)[number];

type CompanyLead = {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  businessType: string;
  branchCount: string;
  message: string;
  status: Exclude<Status, 'ALL'>;
  source?: string;
  notes: string;
  nextAction?: string | null;
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string | null;
};

type LeadForm = {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  businessType: string;
  branchCount: string;
  message: string;
  status: Exclude<Status, 'ALL'>;
  notes: string;
  nextAction: string;
};

const emptyForm: LeadForm = {
  businessName: '',
  ownerName: '',
  phone: '',
  email: '',
  businessType: 'General Retail',
  branchCount: '1',
  message: '',
  status: 'NEW',
  notes: '',
  nextAction: '',
};

function dateLabel(value: string | null | undefined) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === 'WON') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  if (status === 'LOST' || status === 'ARCHIVED') return 'border-zinc-700 bg-zinc-900 text-zinc-400';
  if (status === 'DEMO_SCHEDULED' || status === 'PROPOSAL_SENT') return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  if (status === 'CONTACTED') return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
  return 'border-purple-500/40 bg-purple-500/10 text-purple-300';
}

function formFromLead(lead: CompanyLead): LeadForm {
  return {
    businessName: lead.businessName,
    ownerName: lead.ownerName,
    phone: lead.phone,
    email: lead.email,
    businessType: lead.businessType,
    branchCount: lead.branchCount,
    message: lead.message,
    status: lead.status,
    notes: lead.notes || '',
    nextAction: lead.nextAction || '',
  };
}

export default function CompanyLeadsPage() {
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [selected, setSelected] = useState<CompanyLead | null>(null);
  const [form, setForm] = useState<LeadForm>(emptyForm);
  const [status, setStatus] = useState<Status>('ALL');
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
      const res = await fetch(`/api/company/admin/leads?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Load failed');
      setLeads(data.leads || []);
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
    for (const s of STATUSES) next.set(s, 0);
    next.set('ALL', leads.length);
    for (const lead of leads) next.set(lead.status, (next.get(lead.status) || 0) + 1);
    return next;
  }, [leads]);

  const startNew = () => {
    setSelected(null);
    setForm(emptyForm);
    setMessage(null);
    setError(null);
  };

  const selectLead = (lead: CompanyLead) => {
    setSelected(lead);
    setForm(formFromLead(lead));
    setMessage(null);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/company/admin/leads', {
        method: selected ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected ? { id: selected.id, ...form } : form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSelected(data.lead);
      setForm(formFromLead(data.lead));
      setMessage(selected ? 'Lead updated' : 'Lead created');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/company/admin/leads?id=${encodeURIComponent(selected.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Archive failed');
      setSelected(data.lead);
      setForm(formFromLead(data.lead));
      setMessage('Lead archived');
      await load();
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
            <Briefcase className="h-6 w-6 text-emerald-400" />
            Company Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Prospects from Grabberpoz.com and manual onboarding follow-ups.</p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-black text-zinc-950 transition hover:bg-emerald-400 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New Lead
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative max-w-xl flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search business, owner, phone, or email"
                className="min-h-11 w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`min-h-9 rounded-lg border px-3 text-[11px] font-black transition ${
                    status === s ? 'border-emerald-400 text-emerald-300' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.replace(/_/g, ' ')} {counts.get(s) ? `(${counts.get(s)})` : ''}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          {message && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="grid grid-cols-[1.2fr_0.9fr_0.7fr_0.7fr] gap-3 border-b border-border px-4 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
              <span>Business</span>
              <span>Contact</span>
              <span>Status</span>
              <span>Created</span>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading leads...</div>
              ) : leads.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No leads found.</div>
              ) : (
                leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => selectLead(lead)}
                    className={`grid w-full grid-cols-[1.2fr_0.9fr_0.7fr_0.7fr] gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted/40 ${
                      selected?.id === lead.id ? 'bg-emerald-500/10' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{lead.businessName}</span>
                      <span className="block truncate text-xs text-muted-foreground">{lead.businessType} - {lead.branchCount}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{lead.ownerName}</span>
                      <span className="block truncate text-xs text-muted-foreground">{lead.email}</span>
                    </span>
                    <span>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${statusClass(lead.status)}`}>
                        {lead.status.replace(/_/g, ' ')}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">{dateLabel(lead.createdAt)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">{selected ? 'Lead Details' : 'New Lead'}</h2>
              <p className="text-xs text-muted-foreground">{selected ? `Updated ${dateLabel(selected.updatedAt)}` : 'Create a prospect manually'}</p>
            </div>
            {selected && (
              <button
                type="button"
                onClick={archive}
                disabled={saving || selected.status === 'ARCHIVED'}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </button>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold">
              Business Name
              <input className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            </label>
            <label className="block text-xs font-bold">
              Owner / Contact
              <input className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold">
                Phone
                <span className="relative mt-1 block">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input className="min-h-10 w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-emerald-500" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </span>
              </label>
              <label className="block text-xs font-bold">
                Email
                <span className="relative mt-1 block">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input className="min-h-10 w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-emerald-500" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </span>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold">
                Industry
                <input className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} />
              </label>
              <label className="block text-xs font-bold">
                Branch Count
                <input className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" value={form.branchCount} onChange={(e) => setForm({ ...form, branchCount: e.target.value })} />
              </label>
            </div>
            <label className="block text-xs font-bold">
              Status
              <select className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadForm['status'] })}>
                {STATUSES.filter((s) => s !== 'ALL').map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold">
              Customer Message
              <textarea className="mt-1 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </label>
            <label className="block text-xs font-bold">
              Internal Notes
              <textarea className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
            <label className="block text-xs font-bold">
              Next Action
              <span className="relative mt-1 block">
                <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input className="min-h-10 w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-emerald-500" value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} />
              </span>
            </label>
            {selected && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" />
                <span>Source: {selected.source || 'company_landing'} - ID: {selected.id}</span>
              </div>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-black text-zinc-950 transition hover:bg-emerald-400 active:scale-95 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : selected ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
