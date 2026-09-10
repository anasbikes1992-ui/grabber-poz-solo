'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Tag, Plus, CheckCircle2, X, Zap } from 'lucide-react';

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
  autoApply?: boolean;
  conditions?: {
    minItems?: number;
    minSpend?: number;
    channels?: Array<'POS' | 'STOREFRONT' | 'WHATSAPP'>;
    segment?: string;
  };
}

const CHANNELS = ['POS', 'STOREFRONT', 'WHATSAPP'] as const;
const SEGMENTS = ['', 'NEW', 'SILVER', 'GOLD', 'VIP', 'LAPSED'] as const;

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
  const [validUntil, setValidUntil] = useState('2026-12-31');
  const [autoApply, setAutoApply] = useState(false);
  const [minItems, setMinItems] = useState(0);
  const [channels, setChannels] = useState<Array<'POS' | 'STOREFRONT' | 'WHATSAPP'>>([]);
  const [segment, setSegment] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleChannel = (ch: (typeof CHANNELS)[number]) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newD: DiscountRule = {
      id: `promo_${Date.now()}`,
      code: code.toUpperCase().trim() || (autoApply ? `_AUTO_${Date.now()}` : ''),
      type,
      value: Number(value),
      minSpend: Number(minSpend),
      usageCount: 0,
      validUntil,
      active: true,
      autoApply: autoApply || undefined,
      conditions: autoApply
        ? {
            minSpend: Number(minSpend) || undefined,
            minItems: minItems > 0 ? minItems : undefined,
            channels: channels.length ? channels : undefined,
            segment: segment || undefined,
          }
        : undefined,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Discounts & Rules</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold border border-primary/20">
              Coupons + IF/THEN
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Coupon codes and auto-apply rules (IF cart conditions → THEN discount).
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCode('');
            setValue(10);
            setMinSpend(3000);
            setAutoApply(false);
            setMinItems(0);
            setChannels([]);
            setSegment('');
            setIsModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New rule</span>
        </button>
      </div>

      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        {loadError && <p className="text-xs text-destructive">{loadError}</p>}
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading promotions…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2.5 font-medium">Code / Rule</th>
                  <th className="pb-2.5 font-medium">Discount</th>
                  <th className="pb-2.5 font-medium">IF conditions</th>
                  <th className="pb-2.5 font-medium">Usage</th>
                  <th className="pb-2.5 font-medium">Expires</th>
                  <th className="pb-2.5 font-medium text-right">Mode</th>
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
                    <td className="py-3 text-muted-foreground max-w-xs">
                      {d.autoApply ? (
                        <span className="text-[10px] leading-relaxed">
                          spend ≥ {d.conditions?.minSpend ?? d.minSpend}
                          {d.conditions?.minItems ? ` · items ≥ ${d.conditions.minItems}` : ''}
                          {d.conditions?.channels?.length ? ` · ${d.conditions.channels.join('/')}` : ''}
                          {d.conditions?.segment ? ` · seg ${d.conditions.segment}` : ''}
                        </span>
                      ) : (
                        <span>Min LKR {d.minSpend.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {d.usageCount} {d.maxUsage ? `/ ${d.maxUsage}` : 'times'}
                    </td>
                    <td className="py-3 text-muted-foreground">{d.validUntil}</td>
                    <td className="py-3 text-right">
                      {d.autoApply ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
                          <Zap className="h-3 w-3" /> AUTO
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                          CODE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => void handleSave(e)}
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Create discount rule</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="flex items-center gap-2 font-medium text-foreground">
              <input type="checkbox" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} />
              Auto-apply IF/THEN (no code required at checkout)
            </label>

            {!autoApply && (
              <div>
                <label htmlFor="promo-code" className="text-muted-foreground block mb-1 font-medium">
                  Coupon Code
                </label>
                <input
                  id="promo-code"
                  type="text"
                  required={!autoApply}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. MEGA20"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono font-bold tracking-wider"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="promo-type" className="text-muted-foreground block mb-1 font-medium">
                  THEN discount type
                </label>
                <select
                  id="promo-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'PERCENT' | 'FIXED')}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
                >
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (LKR)</option>
                </select>
              </div>
              <div>
                <label htmlFor="promo-value" className="text-muted-foreground block mb-1 font-medium">
                  Value ({type === 'PERCENT' ? '%' : 'LKR'})
                </label>
                <input
                  id="promo-value"
                  type="number"
                  required
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold"
                />
              </div>
            </div>

            <div>
              <label htmlFor="promo-min" className="text-muted-foreground block mb-1 font-medium">
                IF min spend (LKR)
              </label>
              <input
                id="promo-min"
                type="number"
                value={minSpend}
                onChange={(e) => setMinSpend(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold"
              />
            </div>

            {autoApply && (
              <div className="space-y-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">IF conditions</p>
                <div>
                  <label htmlFor="promo-items" className="text-muted-foreground block mb-1 font-medium">
                    Min line items (0 = any)
                  </label>
                  <input
                    id="promo-items"
                    type="number"
                    min={0}
                    value={minItems}
                    onChange={(e) => setMinItems(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold"
                  />
                </div>
                <fieldset>
                  <legend className="text-muted-foreground mb-1 font-medium">Channels</legend>
                  <div className="flex flex-wrap gap-2">
                    {CHANNELS.map((ch) => (
                      <label key={ch} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border">
                        <input type="checkbox" checked={channels.includes(ch)} onChange={() => toggleChannel(ch)} />
                        {ch}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="promo-seg" className="text-muted-foreground block mb-1 font-medium">
                    Customer segment (optional)
                  </label>
                  <select
                    id="promo-seg"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
                  >
                    {SEGMENTS.map((s) => (
                      <option key={s || 'any'} value={s}>
                        {s || 'Any segment'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="promo-exp" className="text-muted-foreground block mb-1 font-medium">
                Expiration Date
              </label>
              <input
                id="promo-exp"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
              />
            </div>

            {saveSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Rule saved</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
              >
                Save rule
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
