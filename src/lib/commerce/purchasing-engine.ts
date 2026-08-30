/**
 * GRABBER BUSINESS OS — PURCHASING & SUPPLIER AP ENGINE
 * Purchase Orders, Goods Receipt (GRN), Landed Cost & Accounts Payable Posting
 */

import { AccountingEngine, defaultAccountingEngine } from './accounting-engine';
import { InventoryEngine, defaultInventoryEngine } from './inventory-engine';

export interface POLineItem {
  productId: string;
  variantId?: string | null;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  lines: POLineItem[];
  totalAmount: number;
  createdBy?: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GRNReceipt {
  id: string;
  grnNumber: string;
  poId: string;
  supplierId: string;
  warehouseId: string;
  receivedItems: Array<{
    productId: string;
    variantId?: string | null;
    receivedQty: number;
    unitCost: number;
    totalCost: number;
  }>;
  totalReceivedCost: number;
  receivedBy?: string;
  createdAt: Date;
}

export class PurchasingEngine {
  private pos: Map<string, PurchaseOrder> = new Map();
  private grns: GRNReceipt[] = [];
  private inventoryEngine: InventoryEngine;
  private accountingEngine: AccountingEngine;

  constructor(
    inventoryEngine: InventoryEngine = defaultInventoryEngine,
    accountingEngine: AccountingEngine = defaultAccountingEngine
  ) {
    this.inventoryEngine = inventoryEngine;
    this.accountingEngine = accountingEngine;
  }

  public createPurchaseOrder(params: {
    poNumber: string;
    supplierId: string;
    supplierName: string;
    warehouseId: string;
    warehouseName: string;
    items: Array<{ productId: string; variantId?: string | null; productName: string; quantity: number; unitCost: number }>;
    createdBy?: string;
  }): PurchaseOrder {
    const { poNumber, supplierId, supplierName, warehouseId, warehouseName, items, createdBy } = params;

    let totalAmount = 0;
    const lines: POLineItem[] = items.map((item) => {
      const lineCost = Math.round(item.quantity * item.unitCost * 100) / 100;
      totalAmount += lineCost;
      return {
        productId: item.productId,
        variantId: item.variantId || null,
        productName: item.productName,
        orderedQty: item.quantity,
        receivedQty: 0,
        unitCost: item.unitCost,
        totalCost: lineCost,
      };
    });

    const po: PurchaseOrder = {
      id: `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      poNumber,
      supplierId,
      supplierName,
      warehouseId,
      warehouseName,
      status: 'APPROVED',
      lines,
      totalAmount: Math.round(totalAmount * 100) / 100,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pos.set(po.id, po);
    this.pos.set(po.poNumber, po);
    return po;
  }

  /**
   * Receives Goods Receipt Note (GRN):
   * 1. Increases physical inventory stock in Central Warehouse.
   * 2. Records purchase movement in Stock Ledger.
   * 3. Posts financial journal entry: Dr Inventory Asset, Cr Accounts Payable (Supplier).
   * 4. Updates PO received quantities and status.
   */
  public receiveGRN(params: {
    poIdOrNumber: string;
    grnNumber: string;
    items: Array<{ productId: string; variantId?: string | null; receivedQty: number; unitCost: number }>;
    receivedBy?: string;
  }): { grn: GRNReceipt; po: PurchaseOrder } {
    const { poIdOrNumber, grnNumber, items, receivedBy } = params;
    const po = this.pos.get(poIdOrNumber);

    if (!po) {
      throw new Error(`Purchase Order "${poIdOrNumber}" not found.`);
    }

    let totalReceivedCost = 0;
    const receivedRecords = items.map((item) => {
      const cost = Math.round(item.receivedQty * item.unitCost * 100) / 100;
      totalReceivedCost += cost;

      // 1. Physical Stock Movement: PURCHASE_RECEIPT
      this.inventoryEngine.commitMovement({
        locationType: 'WAREHOUSE',
        locationId: po.warehouseId,
        productId: item.productId,
        variantId: item.variantId,
        type: 'PURCHASE_RECEIPT',
        delta: item.receivedQty,
        unitCost: item.unitCost,
        referenceType: 'PURCHASE_ORDER',
        referenceId: po.poNumber,
        actorId: receivedBy,
        notes: `GRN ${grnNumber} for PO ${po.poNumber}`,
      });

      // Update line in PO
      const poLine = po.lines.find(
        (l) => l.productId === item.productId && (l.variantId || null) === (item.variantId || null)
      );
      if (poLine) {
        poLine.receivedQty += item.receivedQty;
      }

      return {
        productId: item.productId,
        variantId: item.variantId,
        receivedQty: item.receivedQty,
        unitCost: item.unitCost,
        totalCost: cost,
      };
    });

    totalReceivedCost = Math.round(totalReceivedCost * 100) / 100;

    // 2. Financial Journal Entry: Dr Inventory (1200), Cr Accounts Payable (2000)
    this.accountingEngine.recordPurchaseGRN({
      poNumber: po.poNumber,
      totalCost: totalReceivedCost,
      poId: po.id,
      supplierName: po.supplierName,
      createdBy: receivedBy,
    });

    // Check if fully received
    const allReceived = po.lines.every((l) => l.receivedQty >= l.orderedQty);
    po.status = allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    po.updatedAt = new Date();

    const grn: GRNReceipt = {
      id: `grn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      grnNumber,
      poId: po.id,
      supplierId: po.supplierId,
      warehouseId: po.warehouseId,
      receivedItems: receivedRecords,
      totalReceivedCost,
      receivedBy,
      createdAt: new Date(),
    };

    this.grns.push(grn);

    return { grn, po };
  }

  public getPO(poIdOrNumber: string): PurchaseOrder | undefined {
    return this.pos.get(poIdOrNumber);
  }
}

export const defaultPurchasingEngine = new PurchasingEngine();
