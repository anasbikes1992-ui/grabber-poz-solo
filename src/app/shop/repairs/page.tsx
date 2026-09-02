import Link from 'next/link';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { RepairServiceCard } from '@/components/repairs/repair-ui';
import { REPAIR_SERVICES } from '@/lib/repairs/services';

export const metadata = {
  title: 'Device Repairs · MobileRepair',
  description: 'Book phone, tablet, and laptop repairs with OEM vs Grade A estimates and courier pickup.',
};

export default function RepairsLandingPage() {
  return (
    <StorefrontShell>
      <section className="relative overflow-hidden border-b border-[var(--sf-border)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(161,98,7,0.12),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--sf-repair)]">Repairs</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Repair your device without the runaround
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[var(--sf-secondary)]">
              Request an in-store or home-visit repair, receive a transparent estimate, and track progress with your ticket code.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop/repairs/book"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[var(--sf-accent)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-opacity duration-200 hover:opacity-90"
              >
                Book repair (estimator)
              </Link>
              <Link
                href="/shop/repairs/request"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--sf-border)] bg-white/80 px-6 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-white"
              >
                Quick request
              </Link>
              <Link
                href="/shop/repairs/track"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--sf-border)] bg-white/80 px-6 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-white"
              >
                Track existing repair
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--sf-border)] bg-white/80 p-6 shadow-xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-secondary)]">Quick estimate</p>
            <p className="mt-3 font-display text-2xl font-bold">Phone · Apple · Cracked screen</p>
            <p className="mt-2 text-sm text-[var(--sf-secondary)]">Typical turnaround 1–3 hours for supported models.</p>
            <p className="mt-4 text-sm font-semibold text-[var(--sf-accent)]">From LKR 6,500 — final quote after inspection</p>
            <Link href="/shop/repairs/request?service=screen-glass-repair" className="mt-5 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full bg-[var(--sf-primary)] text-sm font-semibold text-white">
              Continue with this example
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="font-display text-2xl font-bold">What we repair</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sf-secondary)]">
          Service categories inspired by professional repair shops — configured as Grabber service objects, not catalog products.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REPAIR_SERVICES.map((service) => (
            <RepairServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--sf-border)] bg-[var(--sf-muted)]/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Tell us what happened', 'Device, brand, model, and issue in a guided wizard.'],
              ['Choose service option', 'Drop-off at store or home visit with preferred slot.'],
              ['Approve the estimate', 'We confirm price before chargeable work begins.'],
              ['Collect your device', 'Track status until ready for pickup or delivery.'],
            ].map(([title, body], i) => (
              <li key={title} className="rounded-2xl border border-[var(--sf-border)] bg-white/70 p-5">
                <span className="text-xs font-bold text-[var(--sf-accent)]">Step {i + 1}</span>
                <p className="mt-2 font-semibold">{title}</p>
                <p className="mt-1 text-sm text-[var(--sf-secondary)]">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </StorefrontShell>
  );
}
