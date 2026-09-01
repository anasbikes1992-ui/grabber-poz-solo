'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Check, X } from 'lucide-react';

type Approval = {
  id: string;
  token: string;
  toolName: string;
  description: string;
  risk: string;
  status: string;
  requestedBy: string;
  createdAt: string;
};

export default function ApprovalsPage() {
  const [rows, setRows] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/approvals?status=PENDING');
      const data = await res.json();
      setRows(data.approvals || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, token: string, action: 'approve' | 'reject') {
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id, confirmationToken: action === 'approve' ? token : undefined }),
    });
    const data = await res.json();
    if (!data.success) alert(data.error || 'Action failed');
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400">← Merchant Hub</Link>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 mt-2">
          <ShieldCheck className="w-6 h-6 text-amber-400" /> Approval Center
        </h1>
        <p className="text-xs text-zinc-400 mt-1">Review Jarvis and agent actions before execution.</p>
      </div>
      <div className="space-y-3">
        {loading && <p className="text-zinc-500 text-sm">Loading…</p>}
        {rows.map((r) => (
          <div key={r.id} className="p-4 rounded-2xl glass-card border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white">{r.toolName}</div>
              <div className="text-xs text-zinc-400">{r.description}</div>
              <div className="text-[10px] text-zinc-500 mt-1">{new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void decide(r.id, r.token, 'approve')}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Approve
              </button>
              <button
                type="button"
                onClick={() => void decide(r.id, r.token, 'reject')}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-bold flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Reject
              </button>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-zinc-500 p-8 text-center glass-card rounded-2xl border border-zinc-800">
            No pending approvals.
          </p>
        )}
      </div>
    </div>
  );
}
