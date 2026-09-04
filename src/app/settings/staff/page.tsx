'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCheck, ArrowLeft, Plus, ShieldCheck, MapPin, KeyRound, CheckCircle2, AlertCircle, Building2, Warehouse } from 'lucide-react';

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  branchId: string | null;
  branchName: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  createdAt: string;
};

type Branch = { id: string; name: string; code: string };
type WarehouseItem = { id: string; name: string; code: string };

export default function StaffSettingsPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAREHOUSE' | 'ACCOUNTANT' | 'MARKETING'>('CASHIER');
  const [pin, setPin] = useState('1234');
  const [locationType, setLocationType] = useState<'NONE' | 'BRANCH' | 'WAREHOUSE'>('NONE');
  const [locationId, setLocationId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [staffRes, brRes, whRes] = await Promise.all([
        fetch('/api/settings/staff'),
        fetch('/api/branches').catch(() => null),
        fetch('/api/warehouses').catch(() => null),
      ]);

      const staffData = await staffRes.json();
      if (staffData.success) setStaff(staffData.staff || []);

      if (brRes) {
        const brData = await brRes.json();
        if (brData.success) setBranches(brData.branches || []);
      }

      if (whRes) {
        const whData = await whRes.json();
        if (whData.success) setWarehouses(whData.warehouses || []);
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to load staff accounts' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) {
      setMsg({ type: 'error', text: 'Name and email are required' });
      return;
    }
    setSubmitting(true);
    setMsg(null);

    try {
      const payload: Record<string, any> = {
        name,
        email,
        role,
        pin,
        branchId: locationType === 'BRANCH' ? locationId : null,
        warehouseId: locationType === 'WAREHOUSE' ? locationId : null,
      };

      const res = await fetch('/api/settings/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setMsg({ type: 'error', text: data.error || 'Failed to create staff account' });
        return;
      }

      setMsg({ type: 'success', text: `Staff user "${name}" (${role}) created successfully` });
      setName('');
      setEmail('');
      setRole('CASHIER');
      setPin('1234');
      setLocationType('NONE');
      setLocationId('');
      setShowModal(false);
      void loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error creating staff' });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user: Staff) {
    try {
      const res = await fetch('/api/settings/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          active: !user.active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStaff((prev) =>
          prev.map((s) => (s.id === user.id ? { ...s, active: !s.active } : s)),
        );
      }
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href="/settings"
            className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
          </Link>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-purple-400" /> Staff & Access Control
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage staff credentials, role permissions, PINs, and location assignments.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-all shadow-lg shadow-purple-950/40"
        >
          <Plus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            msg.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
              : 'bg-red-950/40 border border-red-800 text-red-300'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Staff List */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 text-sm">Loading staff accounts...</div>
      ) : staff.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <ShieldCheck className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-white font-semibold">No Staff Accounts Configured</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Create user accounts for cashiers, managers, and warehouse supervisors with individual touch-screen PINs.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
          >
            Add First Staff Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staff.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 transition-all space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-white text-base">{s.name}</div>
                  <div className="text-xs text-zinc-400">{s.email}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.role === 'OWNER'
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        : s.role === 'WAREHOUSE'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : s.role === 'MANAGER'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                    }`}
                  >
                    {s.role}
                  </span>
                  <button
                    onClick={() => toggleActive(s)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      s.active
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        : 'bg-red-950/40 text-red-400 border border-red-800/60'
                    }`}
                  >
                    {s.active ? 'Active' : 'Disabled'}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                {s.warehouseName ? (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Warehouse className="w-3.5 h-3.5" />
                    <span>Warehouse: {s.warehouseName}</span>
                  </div>
                ) : s.branchName ? (
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Branch: {s.branchName}</span>
                  </div>
                ) : (
                  <span className="text-zinc-500">All Locations</span>
                )}

                <span className="text-[11px] text-zinc-600 font-mono">PIN Secured</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-400" /> New Staff Member
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Full Name <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Email Address <span className="text-purple-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. kasun@store.lk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Role <span className="text-purple-400">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="CASHIER">Cashier</option>
                    <option value="WAREHOUSE">Warehouse Staff</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="OWNER">Owner / Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    4-Digit PIN <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    placeholder="1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Location Assignment
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {(['NONE', 'BRANCH', 'WAREHOUSE'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setLocationType(t);
                        setLocationId('');
                      }}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        locationType === t
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {t === 'NONE' ? 'All / Global' : t === 'BRANCH' ? 'Branch' : 'Warehouse'}
                    </button>
                  ))}
                </div>

                {locationType === 'BRANCH' && (
                  <select
                    required
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select Branch...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                )}

                {locationType === 'WAREHOUSE' && (
                  <select
                    required
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select Warehouse...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
