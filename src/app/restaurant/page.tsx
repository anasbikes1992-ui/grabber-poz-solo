'use client';

import { useEffect, useState } from 'react';
import { TableServicePanel } from '@/components/restaurant/table-service-panel';
import { ChefHat, Trash2 } from 'lucide-react';

type RecipeCostRow = {
  id: string;
  name: string;
  dishName?: string;
  salePrice?: number;
  recipeCost?: number;
  foodCostPct?: number;
};

type CatalogProduct = { id: string; name: string; costPrice?: string | number };

export default function RestaurantFloorPage() {
  const [recipes, setRecipes] = useState<RecipeCostRow[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [wasteProductId, setWasteProductId] = useState('');
  const [wasteQty, setWasteQty] = useState(1);
  const [wasteNote, setWasteNote] = useState<string | null>(null);
  const [wasteError, setWasteError] = useState<string | null>(null);
  const [wasteBusy, setWasteBusy] = useState(false);

  useEffect(() => {
    void fetch('/api/recipes')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRecipes(d.recipes || []);
      })
      .catch(() => undefined);
    void fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProducts(d.products || []);
      })
      .catch(() => undefined);
  }, []);

  async function reportWaste(e: React.FormEvent) {
    e.preventDefault();
    if (!wasteProductId) return;
    setWasteBusy(true);
    setWasteError(null);
    setWasteNote(null);
    try {
      const res = await fetch('/api/restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'kitchen_waste',
          productId: wasteProductId,
          quantity: wasteQty,
          autoApprove: true,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Waste failed');
      setWasteNote(
        data.approved
          ? `Wrote off ${data.damage?.damageNumber} · LKR ${Number(data.damage?.totalLoss || 0).toFixed(2)}`
          : `Logged ${data.damage?.damageNumber} (pending approve)`,
      );
    } catch (err) {
      setWasteError(err instanceof Error ? err.message : 'Waste failed');
    } finally {
      setWasteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <TableServicePanel />

      <section className="p-5 rounded-2xl glass-card space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-amber-400" /> Kitchen waste
        </h2>
        <p className="text-[10px] text-muted-foreground">
          VERT-R03 — logs as KITCHEN_WASTE damage and auto-approves stock + GL write-off.
        </p>
        <form onSubmit={reportWaste} className="flex flex-wrap gap-2 items-end">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="waste-prod" className="text-[10px] block mb-1">Ingredient / product</label>
            <select
              id="waste-prod"
              required
              value={wasteProductId}
              onChange={(e) => setWasteProductId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
            >
              <option value="">Select…</option>
              {products.slice(0, 80).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="waste-qty" className="text-[10px] block mb-1">Qty</label>
            <input
              id="waste-qty"
              type="number"
              min={1}
              value={wasteQty}
              onChange={(e) => setWasteQty(Number(e.target.value))}
              className="w-20 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={wasteBusy || !wasteProductId}
            className="min-h-10 px-4 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold disabled:opacity-50"
          >
            Write off
          </button>
        </form>
        {wasteNote && <p className="text-xs text-emerald-400">{wasteNote}</p>}
        {wasteError && <p role="alert" className="text-xs text-amber-400">{wasteError}</p>}
      </section>

      <section className="p-5 rounded-2xl glass-card space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <ChefHat className="h-4 w-4 text-amber-400" /> Recipe food cost
        </h2>
        <p className="text-[10px] text-muted-foreground">
          VERT-R01 — ingredient costPrice × qty vs dish sale price. Target food-cost typically 28–35%.
        </p>
        {recipes.length === 0 ? (
          <p className="text-xs text-zinc-500">No recipes yet — POST /api/recipes with dish + ingredients.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-muted-foreground">
                  <th className="pb-2">Dish</th>
                  <th className="pb-2 text-right">Sale</th>
                  <th className="pb-2 text-right">Recipe cost</th>
                  <th className="pb-2 text-right">Food-cost %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {recipes.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 font-semibold">{r.dishName || r.name}</td>
                    <td className="py-2 text-right font-mono">{Number(r.salePrice || 0).toFixed(2)}</td>
                    <td className="py-2 text-right font-mono">{Number(r.recipeCost || 0).toFixed(2)}</td>
                    <td
                      className={`py-2 text-right font-bold ${
                        Number(r.foodCostPct || 0) > 40 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {Number(r.foodCostPct || 0).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
