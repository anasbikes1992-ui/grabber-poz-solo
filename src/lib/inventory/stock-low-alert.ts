import { dispatchAutomationEvent } from '@/lib/automation/engine';
import { readStorefrontConfig } from '@/lib/config/storefront-config';

export async function dispatchStockLowIfNeeded(input: {
  productId: string;
  productName: string;
  sku: string;
  onHand: number;
  reorderLevel: number;
}) {
  if (input.onHand > input.reorderLevel) return;

  const storefront = await readStorefrontConfig();
  const ownerPhone = storefront.theme.whatsappNumber || process.env.OWNER_WHATSAPP || '';

  await dispatchAutomationEvent('STOCK_LOW', {
    productId: input.productId,
    productName: input.productName,
    sku: input.sku,
    onHand: input.onHand,
    reorderLevel: input.reorderLevel,
    ownerPhone,
  });
}
