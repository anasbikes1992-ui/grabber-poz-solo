import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileText,
  LineChart,
  LockKeyhole,
  Server,
  ShieldCheck,
  Store,
} from 'lucide-react';

const milestones = [
  {
    title: 'Milestone 1 - Live Company Recovery',
    status: 'Done',
    owner: 'Ops',
    goal: 'Latest Coolify deployment is live, health is green, DB is connected, and lead capture works.',
    checks: ['Health build matches main', 'company_leads exists', 'Lead form saves into CRM', 'No ThePartyStore DB change'],
  },
  {
    title: 'Milestone 2 - Company Admin Surface',
    status: 'In progress',
    owner: 'Product',
    goal: 'Owner/Admin has one command surface for CRM, identity, settings, staff, storefront, backups, ops, and handover.',
    checks: ['/company dashboard', '/company/admin command center', '/company/settings profile/logo', 'No dead admin links'],
  },
  {
    title: 'Milestone 3 - Client Provisioning Register',
    status: 'Next',
    owner: 'CEO/CTO',
    goal: 'Track prospects from lead to won client to isolated app/database handover.',
    checks: ['Client status pipeline', 'Provisioning checklist', 'DB/app/env checklist', 'Handover notes'],
  },
  {
    title: 'Milestone 4 - Inventory Demand Planning',
    status: 'Planned',
    owner: 'Inventory',
    goal: 'Turn sales and stock data into safe replenishment recommendations before auto-purchasing.',
    checks: ['ABC/XYZ classes', 'Safety stock', 'Reorder points', 'Suggested PO review'],
  },
  {
    title: 'Milestone 5 - Security & Quality Gate',
    status: 'Planned',
    owner: 'Engineering',
    goal: 'Lock down rate limits, schemas, secrets, dependency audit, upload safety, and error handling.',
    checks: ['Typecheck', 'Full tests', 'Dependency audit', 'Secret scan', 'Browser smoke'],
  },
];

const links = [
  { href: '/company/leads', label: 'Lead CRM', icon: Store },
  { href: '/company/clients', label: 'Client Provisioning', icon: Server },
  { href: '/company/settings', label: 'Company Settings', icon: FileText },
  { href: '/settings/staff', label: 'Staff & Roles', icon: ShieldCheck },
  { href: '/settings/installation', label: 'Cloud & License', icon: Database },
  { href: '/ai/demand', label: 'Demand Planning', icon: LineChart },
  { href: '/ops', label: 'Ops Health', icon: LockKeyhole },
];

export default function CompanyRoadmapPage() {
  return (
    <div className="max-w-6xl space-y-6">
      <section className="rounded-lg border border-border bg-card/90 p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-emerald-300">CEO / CTO Roadmap</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Company Admin Completion Plan</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          One product, one isolated client app, one isolated client database. This roadmap keeps company operations,
          client onboarding, inventory planning, and cleanup in the correct order.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <article key={milestone.title} className="rounded-lg border border-border bg-card p-4 transition duration-200 hover:border-emerald-500/30">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                    Step {index + 1} · {milestone.owner}
                  </p>
                  <h2 className="mt-1 text-lg font-black">{milestone.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{milestone.goal}</p>
                </div>
                <span
                  className={`w-fit rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
                    milestone.status === 'Done'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : milestone.status === 'In progress'
                        ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                        : milestone.status === 'Next'
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                          : 'border-border text-muted-foreground'
                  }`}
                >
                  {milestone.status}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {milestone.checks.map((check) => (
                  <div key={check} className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background/40 px-3 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                    {check}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-black uppercase tracking-wide">Command Links</h2>
          <div className="mt-3 space-y-2">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 text-sm font-bold transition duration-200 hover:border-emerald-500/40 hover:text-emerald-200 active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-emerald-300" />
                  {label}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
