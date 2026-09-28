import Link from 'next/link';
import { ArrowRight, Briefcase, DatabaseBackup, FileText, Settings, ShieldCheck, Store, Users } from 'lucide-react';

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
    href: '/settings',
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

export default function CompanyAdminPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Owner / Admin</p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-black tracking-tight">
          <ShieldCheck className="h-6 w-6 text-emerald-300" />
          SuperAdmin Command Center
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          A controlled command surface for the POZ company instance. This does not change the single-tenant architecture:
          every client still gets a separate app and database.
        </p>
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
    </div>
  );
}
