'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import {
  REPAIR_CATEGORIES,
  listRepairBrands,
  listRepairCategories,
  listRepairModels,
} from '@/lib/repairs/device-tree';
import {
  PRE_REPAIR_CHECKLIST,
  REPAIR_TIME_SLOTS,
  availableBookingDates,
  comparePartQualities,
} from '@/lib/repairs/catalog';
import type { PartQuality } from '@/lib/repairs/catalog';
import type { RepairCategoryId } from '@/lib/repairs/device-tree';

const STEPS = ['Device', 'Repair', 'Booking', 'Checklist', 'Confirm'] as const;

export default function RepairBookPage() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  const [brand, setBrand] = useState('Apple');
  const [category, setCategory] = useState('iPhone');
  const [model, setModel] = useState('iPhone 14 Pro');
  const [repairCategory, setRepairCategory] = useState<RepairCategoryId>('SCREEN');
  const [partQuality, setPartQuality] = useState<PartQuality>('OEM_ORIGINAL');
  const [visitType, setVisitType] = useState<'STORE_VISIT' | 'COURIER_PICKUP'>('STORE_VISIT');
  const [appointmentDate, setAppointmentDate] = useState(availableBookingDates()[0] || '');
  const [timeSlot, setTimeSlot] = useState<string>(REPAIR_TIME_SLOTS[3]);
  const [pickupAddress, setPickupAddress] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const brands = listRepairBrands();
  const categories = listRepairCategories(brand);
  const models = listRepairModels(brand, category);
  const dates = availableBookingDates();

  const comparison = useMemo(
    () => comparePartQualities({ brand, deviceModel: model, repairCategory }),
    [brand, model, repairCategory],
  );

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/repairs/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          visitType,
          appointmentDate,
          timeSlot,
          pickupAddress: visitType === 'COURIER_PICKUP' ? pickupAddress : undefined,
          brand,
          deviceModel: model,
          repairCategory,
          partQuality,
          issueDescription,
          inspectionChecklist: checklist,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Booking failed');
      setTicket(data.ticketCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  if (ticket) {
    return (
      <StorefrontShell>
        <section className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-3xl font-bold">Booking confirmed</h1>
          <p className="mt-3 text-sm text-[var(--sf-secondary)]">Repair ticket</p>
          <p className="mt-2 font-mono text-2xl font-bold text-[var(--sf-accent)]">{ticket}</p>
          <Link href={`/shop/repairs/track?ticket=${encodeURIComponent(ticket)}`} className="mt-8 inline-flex min-h-11 items-center rounded-full bg-[var(--sf-accent)] px-6 font-semibold text-white">
            Track repair
          </Link>
        </section>
      </StorefrontShell>
    );
  }

  return (
    <StorefrontShell>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold">MobileRepair — estimator & booking</h1>
        <p className="mt-2 text-sm text-[var(--sf-secondary)]">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>

        <div className="mt-8 rounded-3xl border border-[var(--sf-border)] bg-white/90 p-6 shadow-sm space-y-5">
          {step === 0 && (
            <>
              <Field label="Brand">
                <select value={brand} onChange={(e) => { setBrand(e.target.value); setCategory(listRepairCategories(e.target.value)[0] || ''); setModel(listRepairModels(e.target.value, listRepairCategories(e.target.value)[0] || '')[0] || ''); }} className="field-input">
                  {brands.map((b) => <option key={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select value={category} onChange={(e) => { setCategory(e.target.value); setModel(listRepairModels(brand, e.target.value)[0] || ''); }} className="field-input">
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Model">
                <select value={model} onChange={(e) => setModel(e.target.value)} className="field-input">
                  {models.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Repair type">
                <select value={repairCategory} onChange={(e) => setRepairCategory(e.target.value as RepairCategoryId)} className="field-input">
                  {REPAIR_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['OEM_ORIGINAL', 'GRADE_A_COMPATIBLE'] as PartQuality[]).map((q) => {
                  const row = q === 'OEM_ORIGINAL' ? comparison.oem : comparison.gradeA;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setPartQuality(q)}
                      className={`rounded-2xl border p-4 text-left text-sm ${partQuality === q ? 'border-[var(--sf-accent)] bg-emerald-50' : 'border-[var(--sf-border)]'}`}
                    >
                      <p className="font-bold">{q === 'OEM_ORIGINAL' ? 'Genuine OEM' : 'Grade A Compatible'}</p>
                      <p className="mt-1 text-lg font-bold text-[var(--sf-accent)]">LKR {row.estimatedCostLkr.toLocaleString()}</p>
                      <p className="mt-1 text-xs text-[var(--sf-secondary)]">{row.estimatedMinutes} min · {row.warrantyDays} day warranty</p>
                    </button>
                  );
                })}
              </div>
              <Field label="Describe the issue">
                <textarea value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} rows={3} className="field-input" placeholder="Cracked screen, battery drains fast…" />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['STORE_VISIT', 'COURIER_PICKUP'] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setVisitType(v)} className={`rounded-xl border p-3 text-sm font-semibold ${visitType === v ? 'border-[var(--sf-accent)] bg-emerald-50' : ''}`}>
                    {v === 'STORE_VISIT' ? 'Store visit appointment' : 'Doorstep courier pickup'}
                  </button>
                ))}
              </div>
              <Field label="Date">
                <select value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="field-input">
                  {dates.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Time slot">
                <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="field-input">
                  {REPAIR_TIME_SLOTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              {visitType === 'COURIER_PICKUP' && (
                <Field label="Pickup address">
                  <textarea value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} rows={2} className="field-input" />
                </Field>
              )}
            </>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Pre-repair inspection checklist</p>
              {PRE_REPAIR_CHECKLIST.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={checklist[item] ?? false} onChange={(e) => setChecklist((c) => ({ ...c, [item]: e.target.checked }))} />
                  {item}
                </label>
              ))}
            </div>
          )}

          {step === 4 && (
            <>
              <Field label="Your name"><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="field-input" /></Field>
              <Field label="Phone"><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="field-input" /></Field>
              <Field label="Email (optional)"><input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="field-input" /></Field>
              <div className="rounded-xl bg-[var(--sf-muted)]/50 p-4 text-sm">
                <p><strong>{brand} {model}</strong> · {REPAIR_CATEGORIES.find((c) => c.id === repairCategory)?.label}</p>
                <p className="mt-1">{visitType === 'STORE_VISIT' ? 'Store visit' : 'Courier pickup'} · {appointmentDate} · {timeSlot}</p>
                <p className="mt-2 font-bold text-[var(--sf-accent)]">
                  Est. LKR {(partQuality === 'OEM_ORIGINAL' ? comparison.oem : comparison.gradeA).estimatedCostLkr.toLocaleString()}
                </p>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          <div className="flex gap-2 pt-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="min-h-11 flex-1 rounded-full border font-semibold text-sm">Back</button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)} className="min-h-11 flex-1 rounded-full bg-[var(--sf-accent)] font-semibold text-sm text-white">Continue</button>
            ) : (
              <button type="button" disabled={busy} onClick={() => void submit()} className="min-h-11 flex-1 rounded-full bg-[var(--sf-primary)] font-semibold text-sm text-white disabled:opacity-50">
                {busy ? 'Booking…' : 'Confirm booking'}
              </button>
            )}
          </div>
        </div>
      </section>
      <style jsx global>{`.field-input { width: 100%; border-radius: 0.75rem; border: 1px solid var(--sf-border); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </StorefrontShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
