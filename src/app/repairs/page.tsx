'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Wrench, ArrowLeft, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { REPAIR_STATUS_FLOW, REPAIR_STATUS_LABELS } from '@/lib/repairs/status';

type RepairJobRow = {
  id: string;
  jobNumber: string;
  customerName: string;
  deviceModel: string;
  status: string;
  partsAmount: string;
  serviceCharge: string;
  advancePaid: string;
};

const STATUS_OPTIONS = [...REPAIR_STATUS_FLOW, 'CANCELLED'];

export default function RepairsPage() {
  const [jobs, setJobs] = useState<RepairJobRow[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [requiredParts, setRequiredParts] = useState('');
  const [partsAmount, setPartsAmount] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(2500);
  const [advancePaid, setAdvancePaid] = useState(1000);
  const [technician, setTechnician] = useState('Senior Tech');
  const [primaryFault, setPrimaryFault] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/repairs');
    const data = await res.json();
    if (!data.success) {
      setError(data.error || 'Could not load repair jobs');
      return;
    }
    setJobs(data.jobs || []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  const due = partsAmount + serviceCharge - advancePaid;

  const resetForm = () => {
    setCustomerName('');
    setMobileNumber('');
    setAddress('');
    setDeviceModel('');
    setRequiredParts('');
    setPrimaryFault('');
    setPartsAmount(0);
    setServiceCharge(2500);
    setAdvancePaid(1000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/repairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone: mobileNumber,
          address,
          deviceModel,
          requiredParts,
          partsAmount,
          serviceCharge,
          advancePaid,
          technician,
          primaryFault,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSaved(true);
      resetForm();
      await load();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <Wrench className="h-5 w-5 text-emerald-400" /> Repair Job Sheet
            </h1>
            <p className="text-xs text-muted-foreground">
              Staff intake · tickets use <span className="font-mono">REP-YYYY-#####</span> · WhatsApp on READY
            </p>
          </div>
        </div>
        <Link
          href="/shop/repairs"
          target="_blank"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
        >
          Public repairs <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <form onSubmit={handleSave} className="p-5 rounded-2xl glass-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="rj-tech" className="text-xs font-semibold block mb-1">
              Technician
            </label>
            <input
              id="rj-tech"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm"
            />
          </div>
          <div>
            <label htmlFor="rj-name" className="text-xs font-semibold block mb-1">
              Customer *
            </label>
            <input
              id="rj-name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm"
            />
          </div>
          <div>
            <label htmlFor="rj-phone" className="text-xs font-semibold block mb-1">
              Phone *
            </label>
            <input
              id="rj-phone"
              required
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="07XXXXXXXX"
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="rj-device" className="text-xs font-semibold block mb-1">
              Device *
            </label>
            <input
              id="rj-device"
              required
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              placeholder="e.g. Apple iPhone 13"
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="rj-fault" className="text-xs font-semibold block mb-1">
              Primary fault
            </label>
            <input
              id="rj-fault"
              value={primaryFault}
              onChange={(e) => setPrimaryFault(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="rj-parts" className="text-xs font-semibold block mb-1">
              Parts description
            </label>
            <input
              id="rj-parts"
              value={requiredParts}
              onChange={(e) => setRequiredParts(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm"
            />
          </div>
          <div>
            <label htmlFor="rj-pa" className="text-xs font-semibold block mb-1">
              Parts amount
            </label>
            <input
              id="rj-pa"
              type="number"
              min={0}
              value={partsAmount}
              onChange={(e) => setPartsAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm font-mono"
            />
          </div>
          <div>
            <label htmlFor="rj-sc" className="text-xs font-semibold block mb-1">
              Service charge
            </label>
            <input
              id="rj-sc"
              type="number"
              min={0}
              value={serviceCharge}
              onChange={(e) => setServiceCharge(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm font-mono"
            />
          </div>
          <div>
            <label htmlFor="rj-adv" className="text-xs font-semibold block mb-1">
              Advance
            </label>
            <input
              id="rj-adv"
              type="number"
              min={0}
              value={advancePaid}
              onChange={(e) => setAdvancePaid(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm font-mono"
            />
          </div>
          <div>
            <label htmlFor="rj-addr" className="text-xs font-semibold block mb-1">
              Address
            </label>
            <input
              id="rj-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm"
            />
          </div>
        </div>
        <p className="text-sm font-bold text-emerald-400">Balance due: LKR {due.toFixed(2)}</p>
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 px-5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50"
        >
          {saved ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved — ticket created
            </span>
          ) : busy ? (
            'Saving…'
          ) : (
            'Save job sheet'
          )}
        </button>
      </form>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-bold">Recent jobs</h2>
          <span className="text-xs text-muted-foreground">{jobs.length} ticket(s)</span>
        </div>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No repair tickets yet. Fill customer, phone, and device above, then save.
          </p>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2">Job</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Device</th>
                <th className="pb-2 text-right">Balance</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((j) => {
                const balance =
                  Number(j.partsAmount || 0) + Number(j.serviceCharge || 0) - Number(j.advancePaid || 0);
                return (
                  <tr key={j.id}>
                    <td className="py-2 font-mono">
                      <Link href={`/repairs/${j.id}`} className="text-emerald-400 hover:underline">
                        {j.jobNumber}
                      </Link>
                    </td>
                    <td className="py-2">{j.customerName}</td>
                    <td className="py-2 text-muted-foreground">{j.deviceModel}</td>
                    <td className="py-2 text-right tabular-nums">LKR {balance.toFixed(0)}</td>
                    <td className="py-2 text-right">
                      <select
                        value={j.status}
                        onChange={async (e) => {
                          await fetch('/api/repairs', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: j.id, status: e.target.value }),
                          });
                          await load();
                        }}
                        className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs max-w-[10rem]"
                        aria-label={`Status for ${j.jobNumber}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {REPAIR_STATUS_LABELS[s] || s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
