/**
 * GRABBER BUSINESS OS — CANONICAL COMMERCE SERVICE
 * Single Source of Truth for POS, Storefront, WhatsApp & Jarvis
 */

import { TaxEngine, defaultTaxEngine } from './tax-engine';
import { PricingEngine, defaultPricingEngine, CartLineInput, PricingResult } from './pricing-engine';
import { InventoryEngine, defaultInventoryEngine, LocationType, StockBalanceState } from './inventory-engine';
import { StateMachineEngine, OrderStatus, PaymentStatus, FulfillmentStatus, OrderChannel } from './order-state-machine';
import { CreditEngine, defaultCreditEngine, PolimPothaEntry } from './credit-engine';
import { AccountingEngine, defaultAccountingEngine, JournalEntry } from './accounting-engine';

export interface CreateOrderParams {
  orderNumber: string;
  channel: OrderChannel;
  fulfillmentLocationType: LocationType;
  fulfillmentLocationId: string;
  branchId?: string;
  registerId?: string;
  shiftId?: string;
  customerId?: string;
  customerName?: string;
  items: CartLineInput[];
  cartDiscount?: number;
  isCustomerExempt?: boolean;
  actorId?: string;
}

export interface ProcessPaymentParams {
  orderId: string;
  method: 'CASH' | 'CARD' | 'CREDIT' | 'COD' | 'ONLINE';
  amount: number;
  providerRef?: string;
  authorizingUserRole?: string; // For credit approval overrides
  actorId?: string;
}

export interface FulfillOrderParams {
  orderId: string;
  actorId?: string;
  courierPartner?: string;
  trackingNumber?: string;
}

export interface ReturnOrderParams {
  orderId: string;
  returnNumber: string;
  reason: string;
  restockApproved: boolean;
  items: Array<{ productId: string; variantId?: string | null; quantity: number; unitPrice: number; unitCost: number }>;
  refundAmount: number;
  approvedBy?: string;
}

export interface CommerceOrder {
  id: string;
  orderNumber: string;
  channel: OrderChannel;
  fulfillmentLocationType: LocationType;
  fulfillmentLocationId: string;
  branchId?: string;
  registerId?: string;
  shiftId?: string;
  customerId?: string;
  customerName?: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  pricing: PricingResult;
  payments: Array<{ method: string; amount: number; providerRef?: string; createdAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

export class CommerceService {
  private orders: Map<string, CommerceOrder> = new Map();
  private taxEngine: TaxEngine;
  private pricingEngine: PricingEngine;
  private inventoryEngine: InventoryEngine;
  private creditEngine: CreditEngine;
  private accountingEngine: AccountingEngine;

  constructor(
    taxEngine: TaxEngine = defaultTaxEngine,
    pricingEngine: PricingEngine = defaultPricingEngine,
    inventoryEngine: InventoryEngine = defaultInventoryEngine,
    creditEngine: CreditEngine = defaultCreditEngine,
    accountingEngine: AccountingEngine = defaultAccountingEngine
  ) {
    this.taxEngine = taxEngine;
    this.pricingEngine = pricingEngine;
    this.inventoryEngine = inventoryEngine;
    this.creditEngine = creditEngine;
    this.accountingEngine = accountingEngine;
  }

  /**
   * 1. CREATE ORDER:
   * - Calculates authoritative prices, discounts, and dynamic effective-dated taxes.
   * - Atomically reserves inventory at the fulfillment location (Branch / Warehouse).
   * - Posts Invoice Journal Entry (Sales Clearing 1090, Revenue 4000, Tax 2100, COGS 5000, Inventory 1200).
   * - Initializes decoupled Order, Payment, and Fulfillment state machines.
   */
  public createOrder(params: CreateOrderParams): CommerceOrder {
    const {
      orderNumber,
      channel,
      fulfillmentLocationType,
      fulfillmentLocationId,
      branchId,
      registerId,
      shiftId,
      customerId,
      customerName,
      items,
      cartDiscount,
      isCustomerExempt,
      actorId,
    } = params;

    // A. Authoritative server-side pricing
    const pricing = this.pricingEngine.calculateTotals(items, {
      cartDiscount,
      isCustomerExempt,
      taxEngine: this.taxEngine,
    });

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // B. Reserve stock at fulfillment location
    const reserveItems = items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
    }));

    this.inventoryEngine.reserveStock({
      locationType: fulfillmentLocationType,
      locationId: fulfillmentLocationId,
      items: reserveItems,
      orderId,
      actorId,
    });

    // C. Record General Ledger Invoice Entry
    const totalCost = pricing.lines.reduce((sum, l) => sum + l.unitCost * l.quantity, 0);
    this.accountingEngine.recordOrderInvoice({
      orderNumber,
      netSales: pricing.taxableTotal,
      taxAmount: pricing.taxTotal,
      grandTotal: pricing.grandTotal,
      totalCost,
      orderId,
      createdBy: actorId,
    });

    const order: CommerceOrder = {
      id: orderId,
      orderNumber,
      channel,
      fulfillmentLocationType,
      fulfillmentLocationId,
      branchId,
      registerId,
      shiftId,
      customerId,
      customerName,
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PENDING',
      fulfillmentStatus: 'PENDING',
      pricing,
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(order.id, order);
    this.orders.set(order.orderNumber, order);
    return order;
  }

  /**
   * 2. PROCESS PAYMENT:
   * - Handles tenders: Cash, Card, Polim Potha Credit, Online Gateway, COD.
   * - Evaluates credit limit & manager approval for Polim Potha sales.
   * - Posts tender clearing journal entry to Financial Ledger.
   * - Updates Payment State Machine to PAID.
   */
  public processPayment(params: ProcessPaymentParams): {
    order: CommerceOrder;
    journalEntry: JournalEntry;
    polimPothaEntry?: PolimPothaEntry;
  } {
    const { orderId, method, amount, providerRef, authorizingUserRole = 'CASHIER', actorId } = params;
    const order = this.orders.get(orderId);

    if (!order) {
      throw new Error(`Order "${orderId}" not found.`);
    }

    let polimPothaEntry: PolimPothaEntry | undefined;

    // Handle Polim Potha (Customer Credit Sale)
    if (method === 'CREDIT') {
      if (!order.customerId) {
        throw new Error('Customer ID is required for Credit (Polim Potha) sales.');
      }

      const creditDecision = this.creditEngine.evaluateCreditApproval({
        customerId: order.customerId,
        saleAmount: amount,
        userRole: authorizingUserRole,
      });

      if (!creditDecision.approved) {
        throw new Error(creditDecision.reason || 'Credit sale rejected: Limit exceeded and no manager override.');
      }

      const postedCredit = this.creditEngine.postEntry({
        customerId: order.customerId,
        type: 'INVOICE',
        amount,
        orderId: order.id,
        notes: `Credit sale for Order ${order.orderNumber}`,
        createdBy: actorId,
      });

      polimPothaEntry = postedCredit.entry;
    }

    // Record Tender Payment Journal Entry against Sales Clearing (1090)
    const paymentIndex = order.payments.length + 1;
    const journalEntry = this.accountingEngine.recordPaymentTender({
      orderNumber: order.orderNumber,
      paymentMethod: method,
      amount,
      orderId: order.id,
      paymentIndex,
      createdBy: actorId,
    });

    order.payments.push({ method, amount, providerRef, createdAt: new Date() });
    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= order.pricing.grandTotal) {
      order.paymentStatus = StateMachineEngine.transitionPayment(order.paymentStatus, 'PAID');
    }

    order.updatedAt = new Date();
    return { order, journalEntry, polimPothaEntry };
  }

  /**
   * 3. FULFILL / DELIVER ORDER:
   * - Decrements physical on-hand inventory and clears reservations.
   * - Transitions Order State to DELIVERED and Fulfillment State to DELIVERED.
   */
  public fulfillOrder(params: FulfillOrderParams): CommerceOrder {
    const { orderId, actorId } = params;
    const order = this.orders.get(orderId);

    if (!order) {
      throw new Error(`Order "${orderId}" not found.`);
    }

    // Commit physical stock movements for each line
    for (const line of order.pricing.lines) {
      this.inventoryEngine.commitMovement({
        locationType: order.fulfillmentLocationType,
        locationId: order.fulfillmentLocationId,
        productId: line.productId,
        variantId: line.variantId,
        type: 'SALE',
        delta: -line.quantity,
        unitCost: line.unitCost,
        referenceType: 'ORDER',
        referenceId: order.orderNumber,
        actorId,
        notes: `Fulfilled line ${line.name} for Order ${order.orderNumber}`,
        isReservationFulfillment: true,
      });
    }

    order.fulfillmentStatus = StateMachineEngine.transitionFulfillment(order.fulfillmentStatus, 'DELIVERED');
    order.orderStatus = StateMachineEngine.transitionOrder(order.orderStatus, 'DELIVERED');
    order.updatedAt = new Date();

    return order;
  }

  /**
   * 4. CANCEL ORDER:
   * - Releases reserved inventory without deducting on-hand stock.
   * - Transitions Order State to CANCELLED.
   */
  public cancelOrder(orderId: string, actorId?: string): CommerceOrder {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order "${orderId}" not found.`);

    const releaseItems = order.pricing.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      quantity: l.quantity,
    }));

    this.inventoryEngine.releaseStockReservation({
      locationType: order.fulfillmentLocationType,
      locationId: order.fulfillmentLocationId,
      items: releaseItems,
      orderId: order.id,
      actorId,
    });

    order.orderStatus = StateMachineEngine.transitionOrder(order.orderStatus, 'CANCELLED');
    order.updatedAt = new Date();
    return order;
  }

  /**
   * 5. PROCESS RETURN & REFUND:
   * - If restock approved, increases physical inventory balance at fulfillment branch.
   * - Posts refund journal entry to General Ledger.
   * - Updates order state to RETURNED.
   */
  public processReturn(params: ReturnOrderParams): { order: CommerceOrder; journalEntry: JournalEntry } {
    const { orderId, returnNumber, reason, restockApproved, items, refundAmount, approvedBy } = params;
    const order = this.orders.get(orderId);

    if (!order) throw new Error(`Order "${orderId}" not found.`);

    let totalRestockedCost = 0;

    if (restockApproved) {
      for (const item of items) {
        totalRestockedCost += item.unitCost * item.quantity;
        this.inventoryEngine.commitMovement({
          locationType: order.fulfillmentLocationType,
          locationId: order.fulfillmentLocationId,
          productId: item.productId,
          variantId: item.variantId,
          type: 'RETURN',
          delta: item.quantity,
          unitCost: item.unitCost,
          referenceType: 'RETURN',
          referenceId: returnNumber,
          actorId: approvedBy,
          notes: `Restock return: ${reason}`,
        });
      }
    }

    // Post Refund Journal Entry
    // Dr Sales Revenue (4000) & Dr Tax Payable (2100)
    // Cr Cash/Bank (1010/1020)
    // Dr Inventory Asset (1200) & Cr COGS (5000) if restocked
    const refundLines = [
      { accountCode: '4000', debit: refundAmount, credit: 0, memo: `Refund for return ${returnNumber}` },
      { accountCode: '1010', debit: 0, credit: refundAmount, memo: `Cash refunded` },
    ];

    if (restockApproved && totalRestockedCost > 0) {
      refundLines.push({ accountCode: '1200', debit: totalRestockedCost, credit: 0, memo: 'Inventory Restocked' });
      refundLines.push({ accountCode: '5000', debit: 0, credit: totalRestockedCost, memo: 'COGS Reversed' });
    }

    const journalEntry = this.accountingEngine.postJournalEntry({
      entryNumber: `JE-REFUND-${returnNumber}`,
      description: `Return Refund ${returnNumber} for Order ${order.orderNumber}`,
      lines: refundLines,
      referenceType: 'REFUND',
      referenceId: returnNumber,
      createdBy: approvedBy,
    });

    order.orderStatus = StateMachineEngine.transitionOrder(order.orderStatus, 'RETURN_REQUESTED');
    order.orderStatus = StateMachineEngine.transitionOrder(order.orderStatus, 'RETURNED');
    order.paymentStatus = StateMachineEngine.transitionPayment(order.paymentStatus, 'REFUNDED');
    order.updatedAt = new Date();

    return { order, journalEntry };
  }

  /**
   * 6. STOCK TRANSFER (Warehouse <-> Branch):
   * - Decrements source location stock with TRANSFER_OUT.
   * - Increments destination location stock with TRANSFER_IN.
   */
  public transferStock(params: {
    transferNumber: string;
    fromLocationType: LocationType;
    fromLocationId: string;
    toLocationType: LocationType;
    toLocationId: string;
    items: Array<{ productId: string; variantId?: string | null; quantity: number; unitCost?: number }>;
    actorId?: string;
  }): { transferNumber: string; sourceBalances: StockBalanceState[]; targetBalances: StockBalanceState[] } {
    const { transferNumber, fromLocationType, fromLocationId, toLocationType, toLocationId, items, actorId } = params;

    const sourceBalances: StockBalanceState[] = [];
    const targetBalances: StockBalanceState[] = [];

    for (const item of items) {
      // 1. Check availability at source
      const currentSource = this.inventoryEngine.getBalance(fromLocationType, fromLocationId, item.productId, item.variantId);
      if (currentSource.available < item.quantity) {
        throw new Error(`Insufficient stock for transfer at source location. Available: ${currentSource.available}, Requested: ${item.quantity}`);
      }

      // 2. Decrement source with TRANSFER_OUT
      const outRes = this.inventoryEngine.commitMovement({
        locationType: fromLocationType,
        locationId: fromLocationId,
        productId: item.productId,
        variantId: item.variantId,
        type: 'TRANSFER_OUT',
        delta: -item.quantity,
        unitCost: item.unitCost,
        referenceType: 'TRANSFER',
        referenceId: transferNumber,
        actorId,
        notes: `Transfer ${transferNumber} to location ${toLocationId}`,
      });
      sourceBalances.push(outRes.balance);

      // 3. Increment destination with TRANSFER_IN
      const inRes = this.inventoryEngine.commitMovement({
        locationType: toLocationType,
        locationId: toLocationId,
        productId: item.productId,
        variantId: item.variantId,
        type: 'TRANSFER_IN',
        delta: item.quantity,
        unitCost: item.unitCost,
        referenceType: 'TRANSFER',
        referenceId: transferNumber,
        actorId,
        notes: `Transfer ${transferNumber} from location ${fromLocationId}`,
      });
      targetBalances.push(inRes.balance);
    }

    return { transferNumber, sourceBalances, targetBalances };
  }

  public getOrder(orderIdOrNumber: string): CommerceOrder | undefined {
    return this.orders.get(orderIdOrNumber);
  }
}

export const defaultCommerceService = new CommerceService();
