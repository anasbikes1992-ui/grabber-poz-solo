'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Briefcase, Building2, CheckCircle2, Clock3, Database, ListChecks, Server, Settings, ShieldCheck, Users } from 'lucide-react';

type CompanyLead = {
  id: string;
  businessName?: string | null;
  ownerName?: string | null;
  email?: string | null;
  phone?: string | null;
  businessType?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

type BusinessProfile = {
  name?: string;
  legalName?: string;
  logoUrl?: string;
};

function dateLabel(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function CompanyDashboardPage() {
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, profileRes] = await Promise.all([
        fetch('/api/company/admin/leads'),
        fetch('/api/settings/business'),
      ]);
      const [leadData, profileData] = await Promise.all([leadRes.json(), profileRes.json()]);
      if (leadData.success) setLeads(leadData.leads || []);
      if (profileData.success) setProfile(profileData.profile || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => {
    const open = leads.filter((lead) => !['WON', 'LOST', 'ARCHIVED'].includes(String(lead.status || 'NEW'))).length;
    const won = leads.filter((lead) => lead.status === 'WON').length;
    const demos = leads.filter((lead) => lead.status === 'DEMO_SCHEDULED').length;
    return { total: leads.length, open, won, demos };
  }, [leads]);

  const metricCards = [
    { label: 'Total leads', value: metrics.total, icon: Users },
    { label: 'Open pipeline', value: metrics.open, icon: Clock3 },
    { label: 'Demos scheduled', value: metrics.demos, icon: Briefcase },
    { label: 'Won clients', value: metrics.won, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/10">
              {profile?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.logoUrl} alt={`${profile.name || 'Company'} logo`} className="h-full w-full object-contain p-2" />
              ) : (
                <Building2 className="h-7 w-7 text-emerald-300" />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Company Admin</p>
              <h1 className="text-2xl font-black tracking-tight">{profile?.name || 'Grabber Business OS Pro'}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Leads, identity, onboarding, and SuperAdmin controls for the POZ company instance.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/company/leads" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-black text-zinc-950 transition duration-200 hover:bg-emerald-400 active:scale-[0.98]">
              <Briefcase className="h-4 w-4" />
              Leads CRM
            </Link>
            <Link href="/company/clients" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-bold text-foreground transition duration-200 hover:border-emerald-400 hover:text-emerald-200 active:scale-[0.98]">
              <Server className="h-4 w-4" />
              Clients
            </Link>
            <Link href="/company/settings" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-bold text-foreground transition duration-200 hover:border-emerald-400 hover:text-emerald-200 active:scale-[0.98]">
              <Settings className="h-4 w-4" />
              Company Settings
            </Link>
            <Link href="/company/roadmap" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-bold text-foreground transition duration-200 hover:border-emerald-400 hover:text-emerald-200 active:scale-[0.98]">
              <ListChecks className="h-4 w-4" />
              Roadmap
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {metricCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4 transition duration-200 hover:border-emerald-500/40">
            <Icon className="mb-3 h-5 w-5 text-emerald-300" />
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-black uppercase tracking-wide">Recent Leads</h2>
            <Link href="/company/leads" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 hover:text-emerald-200">
              Open all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading company pipeline...</div>
            ) : leads.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No company leads yet. Submit a test inquiry from the public company page.</div>
            ) : (
              leads.slice(0, 6).map((lead) => (
                <Link key={lead.id} href="/company/leads" className="grid gap-2 px-4 py-3 text-sm transition duration-200 hover:bg-muted/40 sm:grid-cols-[1fr_0.7fr_0.55fr]">
                  <span>
                    <span className="block font-bold">{lead.businessName || 'Unnamed business'}</span>
                    <span className="block text-xs text-muted-foreground">{lead.businessType || 'General Retail'}</span>
                  </span>
                  <span>
                    <span className="block">{lead.ownerName || 'No owner'}</span>
                    <span className="block text-xs text-muted-foreground">{lead.email || lead.phone || '-'}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{dateLabel(lead.createdAt)}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        <aside className="space-y-3">
          {[
            { href: '/company/admin', label: 'SuperAdmin Command Center', desc: 'Owner/admin routes for CRM, staff, settings, backups.', icon: ShieldCheck },
            { href: '/company/clients', label: 'Client Provisioning', desc: 'Won clients, isolated DB readiness, and handover checklist.', icon: Server },
            { href: '/company/roadmap', label: 'Roadmap & SOP', desc: 'Milestones, acceptance checks, and next work order.', icon: ListChecks },
            { href: '/settings/staff', label: 'Staff & Roles', desc: 'User CRUD, roles, and access control.', icon: Users },
            { href: '/ops', label: 'Ops Health', desc: 'Runtime status and database checks.', icon: Database },
          ].map(({ href, label, desc, icon: Icon }) => (
            <Link key={href} href={href} className="block rounded-lg border border-border bg-card p-4 transition duration-200 hover:border-emerald-500/40 hover:bg-muted/30">
              <Icon className="mb-3 h-5 w-5 text-emerald-300" />
              <p className="font-black">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </aside>
      </section>
    </div>
  );
}
