/** Generate PO lines from size × color matrix grid. */
export type MatrixPoCell = {
  size: string;
  color: string;
  quantity: number;
  unitCost: number;
};

export function buildMatrixPoLines(
  sizes: string[],
  colors: string[],
  grid: Record<string, number>,
  unitCost: number,
): MatrixPoCell[] {
  const lines: MatrixPoCell[] = [];
  for (const size of sizes) {
    for (const color of colors) {
      const key = `${size}::${color}`;
      const qty = grid[key] ?? 0;
      if (qty > 0) {
        lines.push({ size, color, quantity: qty, unitCost });
      }
    }
  }
  return lines;
}

export function matrixGridKey(size: string, color: string) {
  return `${size}::${color}`;
}

export function matrixPoSummary(lines: MatrixPoCell[]) {
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const totalCost = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  return { lineCount: lines.length, totalQty, totalCost: Math.round(totalCost * 100) / 100 };
}

export function linesToPoItems(
  lines: MatrixPoCell[],
  productIdResolver: (size: string, color: string) => string | undefined,
) {
  const items: Array<{ productId: string; quantity: number; unitCost: number; variantLabel: string }> = [];
  for (const line of lines) {
    const productId = productIdResolver(line.size, line.color);
    if (!productId) continue;
    items.push({
      productId,
      quantity: line.quantity,
      unitCost: line.unitCost,
      variantLabel: `${line.size} / ${line.color}`,
    });
  }
  return items;
}
