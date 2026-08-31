'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Award, Plus, AlertCircle, Star } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

type Member = {
  id: string;
  name: string;
  phone: string;
  points: number;
  tier: string;
  totalSpent: number;
};

export default function LoyaltyPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/loyalty');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    setMembers(data.members || []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const enroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setIsOpen(false);
      setName('');
      setPhone('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const earn = async (memberId: string) => {
    const res = await fetch('/api/loyalty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'earn', memberId, amountLkr: 10000 }),
    });
    const data = await res.json();
    if (!data.success) setError(data.error);
    else await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-400" /> Loyalty
          </h1>
          <p className="text-xs text-muted-foreground">1 pt / LKR 100 · tiers via /api/loyalty</p>
        </div>
        <button type="button" onClick={() => setIsOpen(true)} className="min-h-11 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold flex items-center gap-2">
          <Plus className="h-3.5 w-3.5" /> Enroll
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {[
          { tier: 'SILVER', note: '< LKR 25k · 1×' },
          { tier: 'GOLD', note: 'LKR 25k+ · 1×' },
          { tier: 'PLATINUM', note: 'LKR 100k+ · 1×' },
        ].map((t) => (
          <div key={t.tier} className="p-4 rounded-2xl glass-card">
            <p className="font-bold flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-emerald-400" /> {t.tier}
            </p>
            <p className="text-muted-foreground mt-1">{t.note}</p>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">Member</th>
              <th className="pb-2">Tier</th>
              <th className="pb-2 text-right">Points</th>
              <th className="pb-2 text-right">Spent</th>
              <th className="pb-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="py-2">
                  <p className="font-semibold">{m.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{m.phone}</p>
                </td>
                <td className="py-2">{m.tier}</td>
                <td className="py-2 text-right font-mono text-emerald-400">{m.points}</td>
                <td className="py-2 text-right font-mono">{Number(m.totalSpent).toFixed(2)}</td>
                <td className="py-2 text-right">
                  <button type="button" onClick={() => earn(m.id)} className="text-emerald-400 font-bold text-[11px]">
                    +Earn 10k sale
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Enroll member" as="form" onSubmit={enroll}>
        <div className="space-y-3">
          <div>
            <label htmlFor="ly-name" className="text-xs font-semibold block mb-1">Name</label>
            <input id="ly-name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          <div>
            <label htmlFor="ly-phone" className="text-xs font-semibold block mb-1">Phone</label>
            <input id="ly-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50">Enroll</button>
        </div>
      </Modal>
    </div>
  );
}
