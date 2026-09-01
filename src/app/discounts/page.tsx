'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Tag, Plus, CheckCircle2, X } from 'lucide-react';

interface DiscountRule {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSpend: number;
  usageCount: number;
  maxUsage?: number;
  validUntil: string;
  active: boolean;
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/promotions');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load promotions');
      setDiscounts(data.promotions || []);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState(10);
  const [minSpend, setMinSpend] = useState(3000);
  const [validUntil, setValidUntil] = useState('2026-10-31');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newD: DiscountRule = {
      id: `promo_${Date.now()}`,
      code: code.toUpperCase().trim(),
      type,
      value: Number(value),
      minSpend: Number(minSpend),
      usageCount: 0,
      validUntil,
      active: true,
    };

    try {
      const next = [...discounts, newD];
      const res = await fetch('/api/promotions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotions: next }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setDiscounts(data.promotions || next);
      setSaveSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSaveSuccess(false);
      }, 800);
    } catch (err) {
      setLoadError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Discounts & Promotional Coupons</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold border border-primary/20">
              POS & Online Checkout
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Coupon promo codes, percentage/fixed cart discounts, and minimum order validation rules.
          </p>
        </div>

        <button
          onClick={() => {
            setCode('');
            setValue(10);
            setMinSpend(3000);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Coupon Code</span>
        </button>
      </div>

      {/* Coupons Table */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        {loadError && (
          <p className="text-xs text-destructive">{loadError}</p>
        )}
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading promotions…</p>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Coupon Code</th>
                <th className="pb-2.5 font-medium">Discount Value</th>
                <th className="pb-2.5 font-medium">Min Order Spend</th>
                <th className="pb-2.5 font-medium">Usage Count</th>
                <th className="pb-2.5 font-medium">Expires On</th>
                <th className="pb-2.5 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {discounts.map((d) => (
                <tr key={d.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3 font-mono font-bold text-primary flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    <span>{d.code}</span>
                  </td>
                  <td className="py-3 font-bold text-foreground">
                    {d.type === 'PERCENT' ? `${d.value}% Off` : `LKR ${d.value.toFixed(2)} Off`}
                  </td>
                  <td className="py-3 text-muted-foreground font-mono">
                    LKR {d.minSpend.toLocaleString()}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {d.usageCount} {d.maxUsage ? `/ ${d.maxUsage}` : 'times'}
                  </td>
                  <td className="py-3 text-muted-foreground">{d.validUntil}</td>
                  <td className="py-3 text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Create Promotional Coupon</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. MEGA20"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono font-bold tracking-wider"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Discount Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
                  >
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (LKR)</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Value ({type === 'PERCENT' ? '%' : 'LKR'})</label>
                  <input
                    type="number"
                    required
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Minimum Order Spend (LKR)</label>
                <input
                  type="number"
                  value={minSpend}
                  onChange={(e) => setMinSpend(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Expiration Date</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
                />
              </div>
            </div>

            {saveSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Coupon Created Successfully!</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
              >
                Create Promo Coupon
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
