'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontShell } from '@/components/storefront/storefront-shell';

type ServiceOpt = { name: string; fee: number; durationMin: number };

export default function SalonBookPage() {
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    service: 'Haircut',
    specialist: 'Stylist',
    startsAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    notes: '',
  });

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
      <StorefrontShell>
        <section className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-3xl font-bold">Booking confirmed</h1>
          <p className="mt-3 text-sm text-[var(--sf-secondary)]">Your appointment code</p>
          <p className="mt-2 font-mono text-2xl font-bold text-[var(--sf-accent)]">{code}</p>
          <Link href="/shop" className="mt-8 inline-flex min-h-11 items-center rounded-full bg-[var(--sf-accent)] px-6 font-semibold text-white">
            Back to shop
          </Link>
        </section>
      </StorefrontShell>
    );
  }

  return (
    <StorefrontShell>
      <section className="mx-auto max-w-lg px-4 py-12">
        <h1 className="font-display text-3xl font-bold">Book a service</h1>
        <p className="mt-2 text-sm text-[var(--sf-secondary)]">Salon / barber appointments — no login required.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="bk-name" className="text-xs font-semibold block mb-1">Name</label>
            <input
              id="bk-name"
              required
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              className="w-full min-h-11 rounded-xl border border-zinc-300 px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="bk-phone" className="text-xs font-semibold block mb-1">Phone</label>
            <input
              id="bk-phone"
              required
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full min-h-11 rounded-xl border border-zinc-300 px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="bk-svc" className="text-xs font-semibold block mb-1">Service</label>
            <select
              id="bk-svc"
              value={form.service}
              onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
              className="w-full min-h-11 rounded-xl border border-zinc-300 px-3 text-sm"
            >
              {(services.length ? services : [{ name: 'Haircut', fee: 1500, durationMin: 45 }]).map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} — LKR {s.fee}
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
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              className="w-full min-h-11 rounded-xl border border-zinc-300 px-3 text-sm"
            />
          </div>
          {error && <p role="alert" className="text-sm text-amber-700">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-11 rounded-full bg-[var(--sf-accent)] font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Booking…' : 'Confirm booking'}
          </button>
        </form>
      </section>
    </StorefrontShell>
  );
}
