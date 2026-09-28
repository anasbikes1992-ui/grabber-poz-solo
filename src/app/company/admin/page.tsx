import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  DatabaseBackup,
  FileText,
  ListChecks,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';

const sections = [
  {
    title: 'Company CRM',
    desc: 'Create, update, filter, and archive prospect leads from Grabberpoz.com.',
    href: '/company/leads',
    cta: 'Open lead CRUD',
    icon: Briefcase,
  },
  {
    title: 'Company Identity',
    desc: 'Update company name, legal profile, tax details, logo URL, and receipt identity.',
    href: '/company/settings',
    cta: 'Edit settings',
    icon: Settings,
  },
  {
    title: 'Staff & Roles',
    desc: 'Manage users, roles, active status, PINs, and owner/admin access.',
    href: '/settings/staff',
    cta: 'Manage staff',
    icon: Users,
  },
  {
    title: 'Storefront Builder',
    desc: 'Control public storefront visual config, theme preset, logo, hero, and content.',
    href: '/store/builder',
    cta: 'Open builder',
    icon: Store,
  },
  {
    title: 'Backups & Export',
    desc: 'Export operational data and prepare tenant handover snapshots.',
    href: '/settings/installation',
    cta: 'Open backup tools',
    icon: DatabaseBackup,
  },
  {
    title: 'Ops Health',
    desc: 'Check runtime health, database status, and launch readiness signals.',
    href: '/ops',
    cta: 'Open ops',
    icon: FileText,
  },
];

const milestones = [
  { label: 'Live company deployment', state: 'Done', tone: 'emerald' },
  { label: 'Lead CRM + admin capture', state: 'Done', tone: 'emerald' },
  { label: 'Company profile/logo settings', state: 'Live', tone: 'emerald' },
  { label: 'Client onboarding register', state: 'Next', tone: 'amber' },
  { label: 'Deployment register + Coolify hooks', state: 'Planned', tone: 'zinc' },
  { label: 'Inventory demand planning', state: 'Planned', tone: 'zinc' },
];

const operatingRules = [
  'POZ company app keeps its own database.',
  'ThePartyStore database remains unchanged.',
  'Every new client gets a fresh app and fresh database.',
  'Owner/Admin routes use existing CRUD screens first.',
  'No schema or commerce rewrite without an approved milestone.',
];

export default function CompanyAdminPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card/90 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Owner / Admin</p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-black tracking-tight">
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
              SuperAdmin Command Center
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              A controlled command surface for the POZ company instance. This does not change the single-tenant architecture:
              every client still gets a separate app and database.
            </p>
          </div>
          <Link
            href="/company/roadmap"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-500/40 px-4 text-sm font-black text-emerald-200 transition duration-200 hover:border-emerald-300 hover:bg-emerald-500/10 active:scale-[0.98]"
          >
            <ListChecks className="h-4 w-4" />
            Open Roadmap
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ title, desc, href, cta, icon: Icon }) => (
          <Link key={title} href={href} className="group rounded-lg border border-border bg-card p-4 transition duration-200 hover:border-emerald-500/40 hover:bg-muted/30">
            <Icon className="mb-4 h-5 w-5 text-emerald-300" />
            <h2 className="text-lg font-black">{title}</h2>
            <p className="mt-2 min-h-12 text-sm text-muted-foreground">{desc}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-300">
              {cta}
              <ArrowRight className="h-3.5 w-3.5 transition duration-200 group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-300" />
            <h2 className="text-lg font-black">Execution Roadmap</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {milestones.map((item, index) => (
              <div key={item.label} className="rounded-lg border border-border bg-background/40 p-3 transition duration-200 hover:border-emerald-500/30">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-xs font-black text-muted-foreground">
                    {index + 1}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                      item.tone === 'emerald'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : item.tone === 'amber'
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                          : 'border-border text-muted-foreground'
                    }`}
                  >
                    {item.state}
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            <h2 className="text-lg font-black">Operating Rules</h2>
          </div>
          <div className="mt-4 space-y-3">
            {operatingRules.map((rule) => (
              <div key={rule} className="flex gap-3 rounded-lg border border-border bg-background/40 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span className="text-muted-foreground">{rule}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
