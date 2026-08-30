'use client';

import React, { useState } from 'react';
import { Layers, Plus, Search, CheckCircle2, X, Sparkles, Tag } from 'lucide-react';

interface Collection {
  id: string;
  name: string;
  slug: string;
  ruleType: 'CATEGORY' | 'PRICE_UNDER' | 'MANUAL';
  ruleValue: string;
  productCount: number;
  featured: boolean;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([
    { id: 'col_1', name: 'Summer Linen & Cotton Essentials', slug: 'summer-essentials', ruleType: 'CATEGORY', ruleValue: 'Apparel', productCount: 4, featured: true },
    { id: 'col_2', name: 'Budget Picks Under LKR 5,000', slug: 'under-5000', ruleType: 'PRICE_UNDER', ruleValue: '5000', productCount: 2, featured: true },
    { id: 'col_3', name: 'Executive Office Wear', slug: 'office-wear', ruleType: 'CATEGORY', ruleValue: 'Formal', productCount: 3, featured: false },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [ruleType, setRuleType] = useState<'CATEGORY' | 'PRICE_UNDER'>('CATEGORY');
  const [ruleValue, setRuleValue] = useState('Apparel');
  const [featured, setFeatured] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newCol: Collection = {
      id: `col_${Date.now()}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      ruleType,
      ruleValue,
      productCount: 4,
      featured,
    };

    setCollections((prev) => [...prev, newCol]);
    setSaveSuccess(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setSaveSuccess(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Smart Product Collections</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">
              Rule-Based Catalog Engine
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dynamic collections that auto-categorize products by category, price threshold, and tags for the storefront.
          </p>
        </div>

        <button
          onClick={() => {
            setName('');
            setRuleValue('Apparel');
            setIsModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Smart Collection</span>
        </button>
      </div>

      {/* Collections Table */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Collection Name</th>
                <th className="pb-2.5 font-medium">Slug URL</th>
                <th className="pb-2.5 font-medium">Dynamic Matching Rule</th>
                <th className="pb-2.5 font-medium text-right">Matching SKUs</th>
                <th className="pb-2.5 font-medium text-right">Storefront Featured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {collections.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3 font-semibold text-foreground">{c.name}</td>
                  <td className="py-3 font-mono text-[11px] text-muted-foreground">/collections/{c.slug}</td>
                  <td className="py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-secondary font-medium text-foreground">
                      {c.ruleType === 'CATEGORY' ? `Category = ${c.ruleValue}` : `Price ≤ LKR ${c.ruleValue}`}
                    </span>
                  </td>
                  <td className="py-3 text-right font-bold text-foreground">{c.productCount} Products</td>
                  <td className="py-3 text-right">
                    {c.featured ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                        HOMEPAGE
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Standard</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Create Smart Collection</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Collection Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Linen & Cotton Trends"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Rule Type</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
                  >
                    <option value="CATEGORY">Match Category</option>
                    <option value="PRICE_UNDER">Price Under Threshold</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Rule Value</label>
                  <input
                    type="text"
                    required
                    value={ruleValue}
                    onChange={(e) => setRuleValue(e.target.value)}
                    placeholder="e.g. Apparel or 5000"
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="font-medium text-foreground">Feature on Storefront Homepage</span>
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="h-4 w-4 rounded bg-secondary border-border text-primary focus:ring-0"
                />
              </div>
            </div>

            {saveSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Collection Created!</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
              >
                Save Smart Collection
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
