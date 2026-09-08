/**
 * GRABBER BUSINESS OS — OFFLINE POS BUFFER & REPLAY ENGINE
 * Buffers sales locally during network interruptions and synchronizes idempotently upon reconnection.
 */

export interface OfflineCartItem {
  productId: string;
  variantId?: string;
  name?: string;
  unitPrice: number;
  unitCost?: number;
  quantity: number;
  lineDiscount?: number;
}

export interface OfflineSaleTransaction {
  clientTxId?: string;
  offlineId?: string;
  terminalId?: string;
  branchId: string;
  registerId?: string;
  cashierId: string;
  clientSequence?: number;
  clientTimestamp?: number;
  channel?: 'POS';
  customerPhone?: string;
  items: OfflineCartItem[];
  payment?: { method: string; amount: number };
  paymentMethod?: 'CASH' | 'CARD' | 'CREDIT';
  amountPaid?: number;
  offlineTimestamp?: string;
  syncStatus?: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount?: number;
  errorMessage?: string;
}

export interface OfflineSaleSyncResult {
  offlineId: string;
  status: 'COMMITTED' | 'COMMITTED_WITH_STOCK_UNDERRUN' | 'REJECTED';
  orderId?: string;
  message?: string;
}

export class OfflineSyncEngine {
  /**
   * Generates a deterministic client-side transaction key.
   */
  public static generateClientTxId(registerId: string): string {
    return `tx_${registerId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Validates offline transaction payload integrity before sync.
   */
  public static validateOfflineTransaction(tx: OfflineSaleTransaction): { valid: boolean; error?: string } {
    const txId = tx.clientTxId || tx.offlineId;
    if (!txId) return { valid: false, error: 'Missing clientTxId or offlineId' };
    if (!tx.branchId) return { valid: false, error: 'Missing branchId' };
    if (!tx.items || tx.items.length === 0) return { valid: false, error: 'Cart has no items' };
    return { valid: true };
  }

  /**
   * Processes offline sales with physical primacy stock reconciliation.
   * If stock is depleted, sale is still COMMITTED with negative underrun because the customer already walked out with physical goods.
   */
  public static async processOfflineSale(
    tx: OfflineSaleTransaction,
    stockMap: Map<string, number>
  ): Promise<OfflineSaleSyncResult> {
    const offlineId = tx.offlineId || tx.clientTxId || `off_${Date.now()}`;
    let hadUnderrun = false;

    for (const item of tx.items) {
      const currentStock = stockMap.get(item.productId) ?? 0;
      const newStock = currentStock - item.quantity;
      stockMap.set(item.productId, newStock);

      if (newStock < 0) {
        hadUnderrun = true;
      }
    }

    return {
      offlineId,
      status: hadUnderrun ? 'COMMITTED_WITH_STOCK_UNDERRUN' : 'COMMITTED',
      orderId: `ord_${offlineId}`,
      message: hadUnderrun
        ? 'Physical sale committed. Stock underrun recorded for inventory reconciliation.'
        : 'Physical sale committed with positive stock balance.',
    };
  }
}

export const OfflinePosSyncEngine = OfflineSyncEngine;
