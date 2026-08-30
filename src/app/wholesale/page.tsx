'use client';

import React, { useState } from 'react';
import { Building2, Plus, Download, Printer, CheckCircle2, DollarSign, FileText, Search } from 'lucide-react';

interface WholesaleTier {
  productId: string;
  name: string;
  sku: string;
  retailPrice: number;
  tier1MinQty: number;
  tier1Price: number;
  tier2MinQty: number;
  tier2Price: number;
}

export default function WholesalePage() {
  const [tiers, setTiers] = useState<WholesaleTier[]>([
    {
      productId: 'p1',
      name: 'Linen Casual Shirt (Blue/L)',
      sku: 'LNN-SHT-BLU-L',
      retailPrice: 4500.0,
      tier1MinQty: 10,
      tier1Price: 3800.0,
      tier2MinQty: 50,
      tier2Price: 3200.0,
    },
    {
      productId: 'p2',
      name: 'Oxford Button-Down (White/M)',
      sku: 'OXF-SHT-WHT-M',
      retailPrice: 5200.0,
      tier1MinQty: 10,
      tier1Price: 4400.0,
      tier2MinQty: 50,
      tier2Price: 3750.0,
    },
  ]);

  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Wholesale & B2B Volume Pricing Engine</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-semibold border border-indigo-500/20">
              Wholesale & Distribution
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated volume discount tiers (MOQ), distributor contract prices, and B2B Proforma quotations.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Generate B2B Quotation</span>
        </button>
      </div>

      {/* Tier Price Matrix Table */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground">Multi-Tier Pricing Matrix</h3>
          <span className="text-[11px] text-muted-foreground">Auto-applied at POS and B2B Invoicing</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Product & SKU</th>
                <th className="pb-2.5 font-medium text-right">Retail (1-9 pcs)</th>
                <th className="pb-2.5 font-medium text-right">Wholesale Tier 1 (10-49 pcs)</th>
                <th className="pb-2.5 font-medium text-right">Bulk Distributor (50+ pcs)</th>
                <th className="pb-2.5 font-medium text-right">Bulk Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tiers.map((t) => (
                <tr key={t.productId} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3">
                    <p className="font-bold text-foreground">{t.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{t.sku}</p>
                  </td>
                  <td className="py-3 text-right font-mono font-medium text-foreground">
                    LKR {t.retailPrice.toFixed(2)}
                  </td>
                  <td className="py-3 text-right">
                    <p className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      LKR {t.tier1Price.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Min {t.tier1MinQty} units (-15%)</p>
                  </td>
                  <td className="py-3 text-right">
                    <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      LKR {t.tier2Price.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Min {t.tier2MinQty} units (-28%)</p>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                      28.5% Margin
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
