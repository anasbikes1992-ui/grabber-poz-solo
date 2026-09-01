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
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [earnOpen, setEarnOpen] = useState(false);
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [earnAmount, setEarnAmount] = useState('10000');
  const [redeemPoints, setRedeemPoints] = useState('100');
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

  const earn = async (memberId: string, amountLkr: number) => {
    const res = await fetch('/api/loyalty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'earn', memberId, amountLkr }),
    });
    const data = await res.json();
    if (!data.success) setError(data.error);
    else await load();
  };

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return;
    setBusy(true);
    try {
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redeem',
          memberId: activeMember.id,
          points: Number(redeemPoints),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRedeemOpen(false);
      setActiveMember(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (id: string) => {
    if (!confirm('Remove this loyalty member?')) return;
    const res = await fetch(`/api/loyalty?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
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
                <td className="py-2 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMember(m);
                      setEarnAmount('10000');
                      setEarnOpen(true);
                    }}
                    className="text-emerald-400 font-bold text-[11px]"
                  >
                    Earn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMember(m);
                      setRedeemPoints(String(Math.min(100, m.points)));
                      setRedeemOpen(true);
                    }}
                    className="text-amber-400 font-bold text-[11px]"
                  >
                    Redeem
                  </button>
                  <button type="button" onClick={() => removeMember(m.id)} className="text-red-400 font-bold text-[11px]">
                    Remove
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

      <Modal
        isOpen={earnOpen}
        onClose={() => setEarnOpen(false)}
        title={`Earn points — ${activeMember?.name || ''}`}
        as="form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!activeMember) return;
          setBusy(true);
          try {
            await earn(activeMember.id, Number(earnAmount));
            setEarnOpen(false);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="space-y-3">
          <label htmlFor="earn-amt" className="text-xs font-semibold block">
            Sale amount (LKR)
          </label>
          <input
            id="earn-amt"
            type="number"
            min={1}
            required
            value={earnAmount}
            onChange={(e) => setEarnAmount(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono"
          />
          <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50">
            Apply earn
          </button>
        </div>
      </Modal>

      <Modal isOpen={redeemOpen} onClose={() => setRedeemOpen(false)} title={`Redeem points — ${activeMember?.name || ''}`} as="form" onSubmit={redeem}>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Balance: {activeMember?.points ?? 0} pts · 1 pt = LKR 1</p>
          <label htmlFor="redeem-pts" className="text-xs font-semibold block">
            Points to redeem
          </label>
          <input
            id="redeem-pts"
            type="number"
            min={1}
            max={activeMember?.points ?? 0}
            required
            value={redeemPoints}
            onChange={(e) => setRedeemPoints(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono"
          />
          <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold disabled:opacity-50">
            Redeem
          </button>
        </div>
      </Modal>
    </div>
  );
}
