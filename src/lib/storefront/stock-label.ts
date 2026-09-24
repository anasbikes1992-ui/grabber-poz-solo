export type StorefrontStockState = 'in_stock' | 'running_out_soon' | 'out_of_stock';

export function storefrontStockState(stock: number | null | undefined): StorefrontStockState {
  const quantity = Number(stock ?? 0);
  if (quantity <= 0) return 'out_of_stock';
  if (quantity < 10) return 'running_out_soon';
  return 'in_stock';
}

export function storefrontStockLabel(stock: number | null | undefined) {
  const state = storefrontStockState(stock);
  if (state === 'out_of_stock') return 'Out of stock';
  if (state === 'running_out_soon') return 'Running out soon';
  return 'In stock';
}
