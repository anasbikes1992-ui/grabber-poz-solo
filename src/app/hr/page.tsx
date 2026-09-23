'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Users, AlertCircle } from 'lucide-react';

type Employee = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  roleTitle: string | null;
  basicSalary: string;
  active: boolean;
};

type LeaveRow = {
  id: string;
  employeeId: string;
  leaveType: string;
  status: string;
  fromDate: string;
  toDate: string;
};

type PayrollRow = {
  id: string;
  periodLabel: string;
  status: string;
  totalGross: string;
  totalEmployeeEpf: string;
  totalEmployerEpf: string;
  totalEtf: string;
  totalNet: string;
};

export default function HrPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [leave, setLeave] = useState<LeaveRow[]>([]);
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    roleTitle: '',
    basicSalary: '',
  });
  const [selectedId, setSelectedId] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/hr/employees?include=all');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    setRows(data.employees || []);
    setLeave(data.leave || []);
    setPayroll(data.payroll || []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          basicSalary: Number(form.basicSalary || 0),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setForm({ name: '', phone: '', email: '', roleTitle: '', basicSalary: '' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setError(null);
    try {
      const res = await fetch('/api/hr/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, employeeId: selectedId || extra.employeeId, ...extra }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const empName = (id: string) => rows.find((r) => r.id === id)?.name || id.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-400" /> HR & Payroll
        </h1>
        <p className="text-xs text-muted-foreground">
          Employees, leave, EPF 8%/12% + ETF 3% payroll with GL post on finalize
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <form onSubmit={create} className="p-5 rounded-2xl glass-card grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Email (payslips)"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Role"
          value={form.roleTitle}
          onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
        />
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Basic salary LKR"
          type="number"
          min={0}
          step="0.01"
          value={form.basicSalary}
          onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
        />
        <button type="submit" className="min-h-11 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold">
          Add employee
        </button>
      </form>

      <div className="p-5 rounded-2xl glass-card flex flex-wrap gap-2 items-center">
        <select
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Select employee</option>
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="min-h-11 px-3 rounded-xl border border-zinc-700 text-xs"
          disabled={!selectedId}
          onClick={() => act('attendance', { workDate: today, status: 'PRESENT' })}
        >
          Record attendance
        </button>
        <button
          type="button"
          className="min-h-11 px-3 rounded-xl border border-zinc-700 text-xs"
          disabled={!selectedId}
          onClick={() => act('leave', { fromDate: today, toDate: today, leaveType: 'ANNUAL' })}
        >
          Leave request
        </button>
        <button
          type="button"
          className="min-h-11 px-3 rounded-xl border border-zinc-700 text-xs"
          onClick={() =>
            act('payroll', {
              periodLabel: `Pay ${today.slice(0, 7)}`,
              periodStart: `${today.slice(0, 7)}-01`,
              periodEnd: today,
            })
          }
        >
          Draft payroll (EPF/ETF)
        </button>
      </div>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <h2 className="text-sm font-bold mb-3">Employees</h2>
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">Name</th>
              <th className="pb-2">Role</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Basic</th>
              <th className="pb-2">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2">{r.name}</td>
                <td className="py-2">{r.roleTitle || '—'}</td>
                <td className="py-2">{r.email || '—'}</td>
                <td className="py-2">{r.basicSalary}</td>
                <td className="py-2">{r.active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-muted-foreground">
                  No employees yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <h2 className="text-sm font-bold mb-3">Leave requests</h2>
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">Employee</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {leave.map((l) => (
              <tr key={l.id}>
                <td className="py-2">{empName(l.employeeId)}</td>
                <td className="py-2">{l.leaveType}</td>
                <td className="py-2">{l.status}</td>
                <td className="py-2 flex gap-2">
                  {l.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        className="min-h-9 px-2 rounded-lg border border-emerald-700 text-emerald-300"
                        onClick={() => act('leave_decide', { id: l.id, status: 'APPROVED' })}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="min-h-9 px-2 rounded-lg border border-zinc-700"
                        onClick={() => act('leave_decide', { id: l.id, status: 'REJECTED' })}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {leave.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-muted-foreground">
                  No leave requests
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <h2 className="text-sm font-bold mb-3">Payroll runs</h2>
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">Period</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Gross</th>
              <th className="pb-2">EPF emp/empr</th>
              <th className="pb-2">ETF</th>
              <th className="pb-2">Net</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {payroll.map((p) => (
              <tr key={p.id}>
                <td className="py-2">{p.periodLabel}</td>
                <td className="py-2">{p.status}</td>
                <td className="py-2">{p.totalGross}</td>
                <td className="py-2">
                  {p.totalEmployeeEpf} / {p.totalEmployerEpf}
                </td>
                <td className="py-2">{p.totalEtf}</td>
                <td className="py-2 font-semibold">{p.totalNet}</td>
                <td className="py-2 flex flex-wrap gap-2">
                  {p.status === 'DRAFT' && (
                    <>
                      <button
                        type="button"
                        className="min-h-9 px-2 rounded-lg border border-zinc-700"
                        onClick={() => act('payroll_recalc', { id: p.id })}
                      >
                        Recalc
                      </button>
                      <button
                        type="button"
                        className="min-h-9 px-2 rounded-lg border border-emerald-700 text-emerald-300"
                        onClick={() => act('payroll_finalize', { id: p.id })}
                      >
                        Finalize + GL
                      </button>
                      <button
                        type="button"
                        className="min-h-9 px-2 rounded-lg border border-violet-700 text-violet-300"
                        onClick={() => act('payroll_import_commissions', { id: p.id })}
                      >
                        + Salon commissions
                      </button>
                    </>
                  )}
                  {(p.status === 'FINALIZED' || p.status === 'PAID') && (
                    <>
                      <button
                        type="button"
                        className="min-h-9 px-2 rounded-lg border border-sky-700 text-sky-300"
                        onClick={() => act('payroll_pay_wages', { id: p.id, method: 'BANK' })}
                      >
                        Pay wages
                      </button>
                      <button
                        type="button"
                        className="min-h-9 px-2 rounded-lg border border-amber-700 text-amber-300"
                        onClick={() => act('payroll_pay_statutory', { id: p.id, method: 'BANK' })}
                      >
                        Remit EPF/ETF
                      </button>
                      <a
                        className="min-h-9 px-2 rounded-lg border border-zinc-700 inline-flex items-center"
                        href={`/api/hr/payroll-export?runId=${p.id}&type=epf`}
                      >
                        EPF Form C
                      </a>
                      <a
                        className="min-h-9 px-2 rounded-lg border border-zinc-700 inline-flex items-center"
                        href={`/api/hr/payroll-export?runId=${p.id}&type=etf`}
                      >
                        ETF R1
                      </a>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {payroll.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-muted-foreground">
                  No payroll runs yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
