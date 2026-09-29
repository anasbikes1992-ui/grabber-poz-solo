import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileText,
  ClipboardCheck,
  LineChart,
  LockKeyhole,
  ScrollText,
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
    status: 'Done',
    owner: 'Product',
    goal: 'Owner/Admin has one command surface for CRM, identity, settings, staff, storefront, backups, ops, audit, and handover.',
    checks: ['/company dashboard', '/company/admin command center', '/company/settings profile/logo', '/company/audit action history'],
  },
  {
    title: 'Milestone 3 - Client Provisioning Register',
    status: 'Done',
    owner: 'CEO/CTO',
    goal: 'Track prospects from lead to won client to isolated app/database handover and deployment readiness.',
    checks: ['Client status pipeline', 'Provisioning checklist', 'Deployment register', 'Handover readiness gate'],
  },
  {
    title: 'Milestone 4 - ERP Readiness & Demand Planning',
    status: 'In progress',
    owner: 'Inventory',
    goal: 'Turn existing sales, stock, GRN, supplier, and ledger data into safe recommendations before any PO automation.',
    checks: ['107 schema tables mapped', 'ABC/XYZ classes', 'Safety stock and reorder points', 'PO review queue'],
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
  { href: '/company/deployments', label: 'Deployments', icon: Database },
  { href: '/company/handover', label: 'Handover Readiness', icon: ClipboardCheck },
  { href: '/company/audit', label: 'Audit Trail', icon: ScrollText },
  { href: '/company/settings', label: 'Company Settings', icon: FileText },
  { href: '/settings/staff', label: 'Staff & Roles', icon: ShieldCheck },
  { href: '/settings/installation', label: 'Cloud & License', icon: Database },
  { href: '/ai/demand', label: 'Demand Planning', icon: LineChart },
  { href: '/ops', label: 'Ops Health', icon: LockKeyhole },
];

const erpStatus = [
  { area: 'POS, Orders, Stock Ledger', status: 'Certified core', detail: 'Checkout, COD, split payments, stock ledger, returns, shifts, transfers, and GL invariants are covered by tests.' },
  { area: 'Purchasing / GRN / AP', status: 'Implemented foundation', detail: 'Purchase orders, GRN, supplier accounts, AP invoices/payments, and AP journal posting exist. Remaining: PO approval workflow and supplier scorecards.' },
  { area: 'HR / Payroll', status: 'Implemented foundation', detail: 'Employees, attendance, leave, payroll runs/lines, EPF/ETF/PAYE stub, wage payment, statutory remittance, and exports exist. Remaining: official IRD PAYE table certification and biometric clocks.' },
  { area: 'Company Admin', status: 'Live', detail: 'Lead CRM, clients register, deployment register, settings, roadmap, SuperAdmin command center, and audit trail are live.' },
  { area: 'Forecast / Replenishment', status: 'Foundation live', detail: '/ai/demand computes recommendations and /purchasing/recommendations converts one reviewed recommendation into a draft PO. Remaining: forecast accuracy reporting and supplier scorecards.' },
  { area: 'Compliance', status: 'Foundation only', detail: 'E-invoice submissions table exists. Remaining: certified IRD gateway, VAT return pack, and production provider certification.' },
];

const recommendations = [
  {
    title: 'Run DB bootstrap after each company deploy',
    detail: 'This keeps company_leads, company_clients, onboarding tasks, company_deployments, and future company admin tables aligned before UI smoke testing.',
  },
  {
    title: 'Build demand planning as read-only recommendations first',
    detail: 'Forecast tables, SKU classification, safety stock, and suggested PO review now exist. Keep automatic purchasing disabled until approval gates mature.',
  },
  {
    title: 'Keep settings entry under Company',
    detail: 'Owners should start at /company/settings; advanced operational vault routes can remain behind that command surface.',
  },
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

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-300">ERP Readiness Matrix</p>
            <h2 className="mt-1 text-lg font-black">What is complete and what remains</h2>
          </div>
          <p className="text-xs text-muted-foreground">Schema SSOT: `src/db/schema.ts` with 102 table definitions.</p>
        </div>
        <div className="mt-4 grid gap-3">
          {erpStatus.map((item) => (
            <article key={item.area} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-black">{item.area}</h3>
                <span className="w-fit rounded-full border border-emerald-500/30 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                  {item.status}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-black uppercase tracking-wide text-amber-300">Recommended Next Moves</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {recommendations.map((item) => (
            <article key={item.title} className="rounded-lg border border-border bg-background/40 p-3">
              <h3 className="text-sm font-black">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
