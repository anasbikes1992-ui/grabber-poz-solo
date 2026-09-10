/**
 * VERT-C01 helpers — margin from real order line unitCost.
 */
export function sumLineCogs(lines: Array<{ unitCost?: number | string | null; quantity?: number | null }>) {
  return lines.reduce((sum, line) => {
    const qty = Math.max(0, Number(line.quantity || 0));
    const cost = Number(line.unitCost || 0);
    return sum + cost * qty;
  }, 0);
}

export function marginFromRevenueAndCogs(revenue: number, cogs: number) {
  const rev = Number(revenue || 0);
  const cost = Number(cogs || 0);
  const grossProfit = rev - cost;
  const grossMarginPct = rev > 0 ? Math.round((grossProfit / rev) * 1000) / 10 : 0;
  return {
    cogs: Math.round(cost * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMarginPct,
  };
}
