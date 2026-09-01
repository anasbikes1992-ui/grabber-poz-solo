'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCheck, ArrowLeft, ShieldCheck } from 'lucide-react';

type Staff = { id: string; name: string; email: string; role: string; active: boolean };

export default function StaffSettingsPage() {
  const [staff, setStaff] = useState<Staff[]>([]);

  useEffect(() => {
    fetch('/api/settings/staff')
      .then((r) => r.json())
      .then((d) => setStaff(d.staff || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Settings
        </Link>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-purple-400" /> Staff & Permissions
        </h1>
      </div>

      <div className="grid gap-3">
        {staff.map((s) => (
          <div key={s.id} className="p-4 rounded-2xl glass-card border border-zinc-800 flex justify-between items-center">
            <div>
              <div className="font-bold text-white">{s.name}</div>
              <div className="text-xs text-zinc-400">{s.email}</div>
            </div>
            <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-[10px] font-bold uppercase">
              {s.role}
            </span>
          </div>
        ))}
        {staff.length === 0 && (
          <div className="p-8 text-center glass-card rounded-2xl border border-zinc-800">
            <ShieldCheck className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Solo instance uses PIN auth. Add staff rows via seed or DB.</p>
          </div>
        )}
      </div>
    </div>
  );
}
