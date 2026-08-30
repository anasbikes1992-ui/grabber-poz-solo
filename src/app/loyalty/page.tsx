'use client';

import React, { useState } from 'react';
import { Award, Plus, Search, Star, Gift, CheckCircle2, Trophy, Crown } from 'lucide-react';

interface LoyaltyMember {
  id: string;
  name: string;
  phone: string;
  points: number;
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  totalSpent: number;
  lastVisit: string;
}

export default function LoyaltyPage() {
  const [members, setMembers] = useState<LoyaltyMember[]>([
    { id: 'm1', name: 'Sarath Perera', phone: '+94 77 123 4567', points: 420, tier: 'GOLD', totalSpent: 42000.0, lastVisit: 'Today' },
    { id: 'm2', name: 'Chaminda Silva', phone: '+94 71 987 6543', points: 150, tier: 'SILVER', totalSpent: 15000.0, lastVisit: 'Yesterday' },
    { id: 'm3', name: 'Dr. Rohan De Silva', phone: '+94 77 888 9900', points: 1250, tier: 'PLATINUM', totalSpent: 125000.0, lastVisit: '3 days ago' },
  ]);

  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Customer Loyalty Rewards & VIP Tiers</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">
              1 Pt = LKR 1 Discount
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated loyalty points accumulation (1 pt / LKR 100 spent) and VIP redemption at POS counter.
          </p>
        </div>
      </div>

      {/* Tier Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-slate-400 font-bold">
            <Award className="h-4 w-4" />
            <span>Silver Tier (&lt; LKR 25k)</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">1x Points Multiplier</h3>
          <p className="text-[10px] text-muted-foreground">Standard earn rate on every sale</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-amber-500/30 shadow-sm space-y-1 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-500 font-bold">
            <Trophy className="h-4 w-4" />
            <span>Gold Tier (LKR 25k - 100k)</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">1.25x Points Multiplier</h3>
          <p className="text-[10px] text-amber-600 dark:text-amber-400">Includes birthday 10% voucher</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-indigo-500/30 shadow-sm space-y-1 bg-indigo-500/5">
          <div className="flex items-center gap-2 text-indigo-500 font-bold">
            <Crown className="h-4 w-4" />
            <span>Platinum VIP (&gt; LKR 100k)</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">1.5x Points Multiplier</h3>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Free home delivery on all orders</p>
        </div>
      </div>

      {/* Member Directory */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member by name or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Customer Member</th>
                <th className="pb-2.5 font-medium">VIP Tier</th>
                <th className="pb-2.5 font-medium text-right">Available Points</th>
                <th className="pb-2.5 font-medium text-right">Redeemable Value</th>
                <th className="pb-2.5 font-medium text-right">Lifetime Spent</th>
                <th className="pb-2.5 font-medium text-right">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {members
                .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search))
                .map((m) => (
                  <tr key={m.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3">
                      <p className="font-semibold text-foreground">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.phone}</p>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        m.tier === 'PLATINUM' ? 'bg-indigo-500/10 text-indigo-600' : m.tier === 'GOLD' ? 'bg-amber-500/10 text-amber-600' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {m.tier}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-foreground">{m.points} Pts</td>
                    <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      LKR {m.points.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-medium text-muted-foreground">
                      LKR {m.totalSpent.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">{m.lastVisit}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
