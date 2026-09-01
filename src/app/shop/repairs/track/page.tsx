'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { RepairStatusTimeline } from '@/components/repairs/repair-ui';
import { REPAIR_STATUS_LABELS } from '@/lib/repairs/status';

function TrackForm() {
  const params = useSearchParams();
  const [ticket, setTicket] = useState(params.get('ticket') || '');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<{
    ticketCode: string;
    status: string;
    deviceModel: string;
    primaryFault: string | null;
    customerName: string;
  } | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setJob(null);
    try {
      const qs = new URLSearchParams({ ticket: ticket.trim(), phone: phone.trim() });
      const res = await fetch(`/api/repairs/public?${qs}`);
      const data = (await res.json()) as { success?: boolean; error?: string; job?: typeof job };
      if (!data.success || !data.job) throw new Error(data.error || 'Not found');
      setJob(data.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={(e) => void lookup(e)} className="mt-8 space-y-4 rounded-3xl border border-[var(--sf-border)] bg-white/80 p-6 shadow-sm">
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold">Ticket code</span>
          <input value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="REP-2026-00001" className="field-input" required />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold">Mobile number</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="field-input" required />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="min-h-11 w-full cursor-pointer rounded-full bg-[var(--sf-accent)] font-semibold text-white disabled:opacity-40">
          {busy ? 'Looking up…' : 'Track repair'}
        </button>
      </form>

      {job && (
        <div className="mt-8 rounded-3xl border border-[var(--sf-border)] bg-white/80 p-6 shadow-sm">
          <p className="font-mono text-lg font-bold text-[var(--sf-accent)]">{job.ticketCode}</p>
          <p className="mt-1 text-sm text-[var(--sf-secondary)]">{job.deviceModel} · {job.customerName}</p>
          <p className="mt-3 inline-flex rounded-full bg-[var(--sf-muted)] px-3 py-1 text-xs font-semibold">
            {REPAIR_STATUS_LABELS[job.status] || job.status}
          </p>
          {job.primaryFault && <p className="mt-4 text-sm"><strong>Issue:</strong> {job.primaryFault}</p>}
          <div className="mt-6">
            <RepairStatusTimeline status={job.status} />
          </div>
        </div>
      )}
    </>
  );
}

export default function RepairTrackPage() {
  return (
    <StorefrontShell>
      <section className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Track your repair</h1>
        <p className="mt-2 text-sm text-[var(--sf-secondary)]">Enter your ticket code and the phone number used when booking.</p>
        <Suspense fallback={<p className="mt-8 text-sm text-[var(--sf-secondary)]">Loading…</p>}>
          <TrackForm />
        </Suspense>
      </section>
    </StorefrontShell>
  );
}
