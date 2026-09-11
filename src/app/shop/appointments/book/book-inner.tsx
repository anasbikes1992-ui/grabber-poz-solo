'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import type { StorefrontConfig } from '@/lib/config/storefront-config.shared';
import { DEFAULT_STOREFRONT } from '@/lib/config/storefront-config.shared';
import { DEFAULT_VERTICAL_FLAGS, type VerticalFlags } from '@/lib/config/vertical-flags';
import { formatCurrency } from '@/lib/currency/fx-rates';

type ServiceOpt = { name: string; fee: number; durationMin: number };

const FIELD_CLASS =
  'w-full min-h-11 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-surface)] px-3 text-sm text-[var(--sf-on-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]';

/** `datetime-local` value in local time (not UTC) so min/value comparisons line up. */
function toLocalInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function SalonBook({
  cms = DEFAULT_STOREFRONT,
  verticalFlags = DEFAULT_VERTICAL_FLAGS,
}: {
  cms?: StorefrontConfig;
  verticalFlags?: VerticalFlags;
}) {
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    service: 'Haircut',
    specialist: 'Stylist',
    startsAt: toLocalInputValue(new Date(Date.now() + 86400000)),
    notes: '',
  });

  const minStartsAt = useMemo(() => toLocalInputValue(new Date()), []);

  useEffect(() => {
    void fetch('/api/appointments/public')
      .then((r) => r.json())
      .then((d) => {
        if (d.services?.length) {
          setServices(d.services);
          setForm((f) => ({ ...f, service: d.services[0].name }));
        }
      })
      .catch(() => undefined);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fee = services.find((s) => s.name === form.service)?.fee;
      const res = await fetch('/api/appointments/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          fee,
          startsAt: new Date(form.startsAt).toISOString(),
          source: 'PUBLIC',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Booking failed');
      setCode(data.confirmationCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  if (code) {
    return (
      <StorefrontShell cms={cms} verticalFlags={verticalFlags}>
        <section className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-3xl font-bold text-[var(--sf-foreground)]">Booking confirmed</h1>
          <p className="mt-3 text-sm text-[var(--sf-secondary)]">Your appointment code</p>
          <p className="mt-2 font-mono text-2xl font-bold text-[var(--sf-accent)]">{code}</p>
          <Link
            href="/shop"
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-[var(--sf-accent)] px-6 font-semibold text-[var(--sf-on-accent)]"
          >
            Back to shop
          </Link>
        </section>
      </StorefrontShell>
    );
  }

  return (
    <StorefrontShell cms={cms} verticalFlags={verticalFlags}>
      <section className="mx-auto max-w-lg px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-[var(--sf-foreground)]">Book a service</h1>
        <p className="mt-2 text-sm text-[var(--sf-secondary)]">Salon / barber appointments — no login required.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="bk-name" className="text-xs font-semibold block mb-1">Name</label>
            <input
              id="bk-name"
              required
              autoComplete="name"
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label htmlFor="bk-phone" className="text-xs font-semibold block mb-1">Phone</label>
            <input
              id="bk-phone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="07X XXX XXXX"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label htmlFor="bk-svc" className="text-xs font-semibold block mb-1">Service</label>
            <select
              id="bk-svc"
              value={form.service}
              onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
              className={FIELD_CLASS}
            >
              {(services.length ? services : [{ name: 'Haircut', fee: 1500, durationMin: 45 }]).map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} — {formatCurrency(s.fee)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="bk-when" className="text-xs font-semibold block mb-1">Preferred time</label>
            <input
              id="bk-when"
              type="datetime-local"
              required
              min={minStartsAt}
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              className={FIELD_CLASS}
            />
          </div>
          {error && <p role="alert" className="text-sm font-medium text-[var(--sf-accent)]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-11 cursor-pointer rounded-full bg-[var(--sf-accent)] font-semibold text-[var(--sf-on-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Booking…' : 'Confirm booking'}
          </button>
        </form>
      </section>
    </StorefrontShell>
  );
}
