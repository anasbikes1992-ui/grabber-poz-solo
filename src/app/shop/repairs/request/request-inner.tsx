'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { REPAIR_BRANDS, REPAIR_DEVICE_TYPES, REPAIR_SERVICES, getRepairServiceBySlug } from '@/lib/repairs/services';
import { buildRepairEstimatePreview } from '@/lib/repairs/pricing';
import type { RepairIntakePayload, RepairServiceMode } from '@/lib/repairs/types';

const STEPS = ['Device', 'Problem', 'Service', 'Contact', 'Review'] as const;

export default function RepairRequestWizardPage() {
  const params = useSearchParams();
  const initialService = params.get('service') || REPAIR_SERVICES[0].slug;
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  const [form, setForm] = useState<RepairIntakePayload>({
    serviceSlug: initialService,
    deviceType: 'Phone',
    brand: 'Apple',
    model: '',
    issue: '',
    issueDetail: '',
    mode: 'DROP_OFF',
    preferredSlot: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    contactChannel: 'WHATSAPP',
  });

  const service = getRepairServiceBySlug(form.serviceSlug);
  const estimate = useMemo(
    () =>
      buildRepairEstimatePreview({
        serviceSlug: form.serviceSlug,
        mode: form.mode,
        brand: form.brand,
        model: form.model,
      }),
    [form.serviceSlug, form.mode, form.brand, form.model],
  );

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/repairs/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; job?: { ticketCode: string } };
      if (!data.success || !data.job?.ticketCode) throw new Error(data.error || 'Could not submit request');
      setTicket(data.job.ticketCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  }

  if (ticket) {
    return (
      <StorefrontShell>
        <section className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
          <h1 className="font-display text-3xl font-bold">Request received</h1>
          <p className="mt-3 text-[var(--sf-secondary)]">Your repair ticket is</p>
          <p className="mt-2 font-mono text-2xl font-bold text-[var(--sf-accent)]">{ticket}</p>
          <p className="mt-6 text-sm text-[var(--sf-secondary)]">
            Save this code and your phone number to track progress.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={`/shop/repairs/track?ticket=${encodeURIComponent(ticket)}`} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--sf-accent)] px-6 font-semibold text-white">
              Track repair
            </Link>
            <Link href="/shop/repairs" className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-[var(--sf-border)] px-6 font-semibold">
              Back to repairs
            </Link>
          </div>
        </section>
      </StorefrontShell>
    );
  }

  return (
    <StorefrontShell>
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Repair request</h1>
        <p className="mt-2 text-sm text-[var(--sf-secondary)]">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

        <div className="mt-6 flex gap-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
          {STEPS.map((label, i) => (
            <div key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[var(--sf-accent)]' : 'bg-[var(--sf-muted)]'}`} title={label} />
          ))}
        </div>

        <motion.div
          key={step}
          initial={reduceMotion ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-8 space-y-4 rounded-3xl border border-[var(--sf-border)] bg-white/80 p-6 shadow-sm"
        >
          {step === 0 && (
            <>
              <Field label="Service category">
                <select value={form.serviceSlug} onChange={(e) => setForm((f) => ({ ...f, serviceSlug: e.target.value }))} className="field-input">
                  {REPAIR_SERVICES.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Device type">
                <select value={form.deviceType} onChange={(e) => setForm((f) => ({ ...f, deviceType: e.target.value }))} className="field-input">
                  {REPAIR_DEVICE_TYPES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Brand">
                <select value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} className="field-input">
                  {REPAIR_BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </Field>
              <Field label="Model">
                <input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="e.g. iPhone 13 or I don't know" className="field-input" />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="What is wrong?">
                <textarea value={form.issue} onChange={(e) => setForm((f) => ({ ...f, issue: e.target.value }))} rows={3} className="field-input" required />
              </Field>
              <Field label="Additional details (optional)">
                <textarea value={form.issueDetail} onChange={(e) => setForm((f) => ({ ...f, issueDetail: e.target.value }))} rows={2} className="field-input" />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm font-semibold text-[var(--sf-foreground)]">How would you like service?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['DROP_OFF', 'HOME_VISIT'] as RepairServiceMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, mode }))}
                    className={`min-h-[88px] cursor-pointer rounded-2xl border p-4 text-left transition-colors duration-200 ${form.mode === mode ? 'border-[var(--sf-accent)] bg-[var(--sf-repair-muted)]' : 'border-[var(--sf-border)]'}`}
                  >
                    <p className="font-semibold">{mode === 'DROP_OFF' ? 'Drop off at store' : 'Home visit'}</p>
                    <p className="mt-1 text-xs text-[var(--sf-secondary)]">
                      {mode === 'DROP_OFF' ? 'Bring device to our counter' : 'Technician visits you (+ travel fee)'}
                    </p>
                  </button>
                ))}
              </div>
              <Field label="Preferred date / time">
                <input value={form.preferredSlot} onChange={(e) => setForm((f) => ({ ...f, preferredSlot: e.target.value }))} placeholder="e.g. Tomorrow after 4pm" className="field-input" />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Your name">
                <input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} className="field-input" required />
              </Field>
              <Field label="Mobile number">
                <input value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} inputMode="tel" className="field-input" required />
              </Field>
              <Field label="Email (optional)">
                <input value={form.customerEmail} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} type="email" className="field-input" />
              </Field>
            </>
          )}

          {step === 4 && (
            <div className="space-y-3 text-sm">
              <p><strong>Service:</strong> {service?.name}</p>
              <p><strong>Device:</strong> {form.brand} {form.model || form.deviceType}</p>
              <p><strong>Issue:</strong> {form.issue}</p>
              <p><strong>Mode:</strong> {form.mode === 'DROP_OFF' ? 'Drop-off' : 'Home visit'}</p>
              <div className="rounded-2xl bg-[var(--sf-muted)] p-4">
                <p className="font-semibold">{estimate.label}</p>
                {estimate.amountLkr && <p className="mt-1 text-[var(--sf-accent)]">From LKR {estimate.amountLkr.toLocaleString('en-LK')}</p>}
                <p className="mt-2 text-xs text-[var(--sf-secondary)]">{estimate.disclaimer}</p>
              </div>
            </div>
          )}

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </motion.div>

        <div className="sticky bottom-20 mt-6 flex gap-3 md:bottom-6">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="min-h-11 flex-1 cursor-pointer rounded-full border border-[var(--sf-border)] font-semibold">
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={(step === 1 && !form.issue.trim()) || (step === 3 && (!form.customerName.trim() || !form.customerPhone.trim()))}
              className="min-h-11 flex-1 cursor-pointer rounded-full bg-[var(--sf-accent)] font-semibold text-white disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => void submit()} className="min-h-11 flex-1 cursor-pointer rounded-full bg-[var(--sf-primary)] font-semibold text-white disabled:opacity-40">
              {busy ? 'Submitting…' : 'Request repair assessment'}
            </button>
          )}
        </div>
      </section>
    </StorefrontShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-semibold text-[var(--sf-foreground)]">{label}</span>
      {children}
    </label>
  );
}
