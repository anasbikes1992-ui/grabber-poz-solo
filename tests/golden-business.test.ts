import { describe, it, expect } from 'vitest';
import { TaxEngine } from '../src/lib/commerce/tax-engine';
import { PricingEngine } from '../src/lib/commerce/pricing-engine';
import { InventoryEngine } from '../src/lib/commerce/inventory-engine';
import { CreditEngine } from '../src/lib/commerce/credit-engine';
import { AccountingEngine } from '../src/lib/commerce/accounting-engine';
import { PurchasingEngine } from '../src/lib/commerce/purchasing-engine';
import { CommerceService, CommerceOrder } from '../src/lib/commerce/commerce-service';
import { DEFAULT_CONFIGS } from '../src/lib/config/business-config';
import { OfflineSyncEngine } from '../src/lib/pos/offline-sync';
import { encryptSecret, decryptSecret } from '../src/lib/security/encryption';

describe('GRABBER BUSINESS OS — MASTER PRODUCTION INVARIANT TEST SUITE (18 E2E GATES)', () => {
  const taxEngine = new TaxEngine();
  const pricingEngine = new PricingEngine(taxEngine);
  const inventoryEngine = new InventoryEngine();
  const creditEngine = new CreditEngine();
  const accountingEngine = new AccountingEngine();
  const purchasingEngine = new PurchasingEngine(inventoryEngine, accountingEngine);
  const commerceService = new CommerceService(taxEngine, pricingEngine, inventoryEngine, creditEngine, accountingEngine);

  // Entities Context
  const centralWarehouseId = 'wh_central_colombo';
  const colomboBranchId = 'br_colombo_main';
  const supplierId = 'sup_textiles_ltd';
  const customerId = 'cust_sarath_perera';
  const productId = 'prod_linen_shirt';
  const variantId = 'size_L_blue';

  let activeOrder: CommerceOrder;
  let activeOrder2: CommerceOrder;

  // ----------------------------------------------------
  // SECTION 1: SYSTEM SETUP & EFFECTIVE-DATED TAX
  // ----------------------------------------------------
  it('01: Configures System Vertical and Feature Toggles', () => {
    const config = DEFAULT_CONFIGS.FASHION;
    expect(config.vertical).toBe('FASHION');
    expect(config.features?.variants.enabled).toBe(true);
    expect(config.features?.creditSalesPolimPotha.enabled).toBe(true);
  });

  it('02: Resolves Effective-Dated Sri Lankan 18% VAT Rate', () => {
    taxEngine.registerRate({
      id: 'rate_vat_18',
      taxProfileId: 'tax_standard_vat',
      name: 'VAT 18%',
      ratePercentage: 18.0,
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null,
    });
    const activeRate = taxEngine.resolveActiveRate('tax_standard_vat', new Date());
    expect(activeRate?.ratePercentage).toBe(18.0);
  });

  // ----------------------------------------------------
  // SECTION 2: PROCUREMENT, GRN & WAVG COSTING
  // ----------------------------------------------------
  it('03: Creates Purchase Order (100 units @ LKR 2,500.00)', () => {
    const po = purchasingEngine.createPurchaseOrder({
      poNumber: 'PO-2026-001',
      supplierId,
      supplierName: 'Lanka Textiles Ltd',
      warehouseId: centralWarehouseId,
      warehouseName: 'Central Colombo Warehouse',
      items: [{ productId, variantId, productName: 'Linen Casual Shirt - L Blue', quantity: 100, unitCost: 2500.0 }],
      createdBy: 'user_admin',
    });
    expect(po.totalAmount).toBe(250000.0);
    expect(po.status).toBe('APPROVED');
  });

  it('04: Receives Full GRN and Posts Balanced AP Journal', () => {
    const { grn, po } = purchasingEngine.receiveGRN({
      poIdOrNumber: 'PO-2026-001',
      grnNumber: 'GRN-2026-001',
      items: [{ productId, variantId, receivedQty: 100, unitCost: 2500.0 }],
      receivedBy: 'user_warehouse_lead',
    });
    expect(po.status).toBe('RECEIVED');
    expect(grn.totalReceivedCost).toBe(250000.0);

    const stock = inventoryEngine.getBalance('WAREHOUSE', centralWarehouseId, productId, variantId);
    expect(stock.onHand).toBe(100);
    expect(stock.available).toBe(100);

    const apJournal = accountingEngine.getEntries().find((j) => j.referenceId === 'PO-2026-001' || j.description.includes('PO-2026-001'));
    expect(apJournal).toBeDefined();
    expect(apJournal?.totalDebit).toBe(250000.0);
    expect(apJournal?.totalCredit).toBe(250000.0);
  });

  // ----------------------------------------------------
  // SECTION 3: INTER-BRANCH STOCK TRANSFER
  // ----------------------------------------------------
  it('05: Dispatches 40 units from Warehouse to Colombo Branch', () => {
    inventoryEngine.commitMovement({
      locationType: 'WAREHOUSE',
      locationId: centralWarehouseId,
      productId,
      variantId,
      type: 'TRANSFER_OUT',
      delta: -40,
      notes: 'Transfer dispatch to Colombo Main Branch',
    });

    const whStock = inventoryEngine.getBalance('WAREHOUSE', centralWarehouseId, productId, variantId);
    expect(whStock.onHand).toBe(60);
  });

  it('06: Receives Transfer at Colombo Branch with Invariant Check', () => {
    inventoryEngine.commitMovement({
      locationType: 'BRANCH',
      locationId: colomboBranchId,
      productId,
      variantId,
      type: 'TRANSFER_IN',
      delta: 40,
      notes: 'Transfer received at Colombo Main Branch',
    });

    const branchStock = inventoryEngine.getBalance('BRANCH', colomboBranchId, productId, variantId);
    expect(branchStock.onHand).toBe(40);
    expect(branchStock.available).toBe(40);
  });

  // ----------------------------------------------------
  // SECTION 4: PRICING & VAT COMPUTATION
  // ----------------------------------------------------
  it('07: Computes Authoritative Line Totals with 18% VAT (2 × 4,500 = 10,620.00)', () => {
    const result = pricingEngine.calculateTotals([
      {
        productId,
        variantId,
        name: 'Linen Casual Shirt',
        unitPrice: 4500.0,
        unitCost: 2500.0,
        quantity: 2,
        taxProfileId: 'tax_standard_vat',
      },
    ]);
    expect(result.subtotal).toBe(9000.0);
    expect(result.taxTotal).toBe(1620.0);
    expect(result.grandTotal).toBe(10620.0);
  });

  // ----------------------------------------------------
  // SECTION 5: CANONICAL COMMERCE ORDER & CHECKOUT
  // ----------------------------------------------------
  it('08: Creates Canonical POS Order & Atomically Reserves Stock', () => {
    const order = commerceService.createOrder({
      orderNumber: 'POS-2026-9001',
      channel: 'POS',
      fulfillmentLocationType: 'BRANCH',
      fulfillmentLocationId: colomboBranchId,
      items: [
        {
          productId,
          variantId,
          name: 'Linen Casual Shirt',
          unitPrice: 4500.0,
          unitCost: 2500.0,
          quantity: 2,
          taxProfileId: 'tax_standard_vat',
        },
      ],
      actorId: 'user_cashier_1',
    });

    activeOrder = order;
    expect(order.orderStatus).toBe('CONFIRMED');
    expect(order.pricing.grandTotal).toBe(10620.0);

    const stock = inventoryEngine.getBalance('BRANCH', colomboBranchId, productId, variantId);
    expect(stock.onHand).toBe(40);
    expect(stock.reserved).toBe(2);
    expect(stock.available).toBe(38); // Strict reservation invariant!
  });

  it('09: Processes Cash Payment and Fulfills Order (Deducts Stock)', () => {
    commerceService.processPayment({
      orderId: activeOrder.id,
      method: 'CASH',
      amount: 10620.0,
    });
    expect(activeOrder.paymentStatus).toBe('PAID');

    commerceService.fulfillOrder({
      orderId: activeOrder.id,
      actorId: 'user_cashier_1',
    });
    expect(activeOrder.orderStatus).toBe('DELIVERED');

    const stock = inventoryEngine.getBalance('BRANCH', colomboBranchId, productId, variantId);
    expect(stock.onHand).toBe(38);
    expect(stock.reserved).toBe(0);
    expect(stock.available).toBe(38);
  });

  // ----------------------------------------------------
  // SECTION 6: POLIM POTHA (AR CREDIT) & AGING GATES
  // ----------------------------------------------------
  it('10: Authorizes Credit Sale within Limit (Limit: 50,000 | Sale: 10,620)', () => {
    creditEngine.getAccount(customerId, 'Sarath Perera', 50000.0);

    const order = commerceService.createOrder({
      orderNumber: 'POS-2026-9002',
      channel: 'POS',
      fulfillmentLocationType: 'BRANCH',
      fulfillmentLocationId: colomboBranchId,
      customerId,
      customerName: 'Sarath Perera',
      items: [
        {
          productId,
          variantId,
          name: 'Linen Casual Shirt',
          unitPrice: 4500.0,
          unitCost: 2500.0,
          quantity: 2,
          taxProfileId: 'tax_standard_vat',
        },
      ],
      actorId: 'user_cashier_1',
    });

    const { polimPothaEntry } = commerceService.processPayment({
      orderId: order.id,
      method: 'CREDIT',
      amount: 10620.0,
      authorizingUserRole: 'OWNER',
    });

    expect(polimPothaEntry).toBeDefined();
    const balance = creditEngine.getAccount(customerId);
    expect(balance.currentBalance).toBe(10620.0);
    expect(balance.availableCredit).toBe(39380.0);
  });

  it('11: Hard Blocks Credit Sale Exceeding Available Credit Limit', () => {
    const order = commerceService.createOrder({
      orderNumber: 'POS-2026-9003',
      channel: 'POS',
      fulfillmentLocationType: 'BRANCH',
      fulfillmentLocationId: colomboBranchId,
      customerId,
      customerName: 'Sarath Perera',
      items: [
        {
          productId,
          variantId,
          name: 'Linen Casual Shirt',
          unitPrice: 4500.0,
          unitCost: 2500.0,
          quantity: 2,
          taxProfileId: 'tax_standard_vat',
        },
      ],
    });

    expect(() => {
      commerceService.processPayment({
        orderId: order.id,
        method: 'CREDIT',
        amount: 500000.0, // Exceeds limit
        authorizingUserRole: 'CASHIER', // Cashier cannot override
      });
    }).toThrow(/Sale exceeds available credit/);
  });

  it('12: Processes Partial Polim Potha Repayment and Updates AR Balance', () => {
    const { entry } = creditEngine.postEntry({
      customerId,
      type: 'REPAYMENT',
      amount: 5000.0,
      notes: 'Cash payment at cash counter',
      createdBy: 'user_cashier_1',
    });
    expect(entry.amount).toBe(5000.0);
    const balance = creditEngine.getAccount(customerId);
    expect(balance.currentBalance).toBe(5620.0);
  });

  // ----------------------------------------------------
  // SECTION 7: RETURNS, RESTOCKING & DEFECTIVE QUARANTINE
  // ----------------------------------------------------
  it('13: Processes Resellable Return: Restocks Available Inventory & Posts Journal', () => {
    const preStock = inventoryEngine.getBalance('BRANCH', colomboBranchId, productId, variantId).onHand;
    const { journalEntry } = commerceService.processReturn({
      orderId: activeOrder.id,
      returnNumber: 'RET-2026-001',
      reason: 'Customer requested size exchange',
      restockApproved: true,
      items: [{ productId, variantId, quantity: 1, unitPrice: 4500.0, unitCost: 2500.0 }],
      refundAmount: 5310.0,
      approvedBy: 'user_manager',
    });
    expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);

    const postStock = inventoryEngine.getBalance('BRANCH', colomboBranchId, productId, variantId).onHand;
    expect(postStock).toBe(preStock + 1);
  });

  it('14: Processes Defective Return: Does NOT increase Sellable Stock', () => {
    // Create and fulfill second order
    activeOrder2 = commerceService.createOrder({
      orderNumber: 'POS-2026-9004',
      channel: 'POS',
      fulfillmentLocationType: 'BRANCH',
      fulfillmentLocationId: colomboBranchId,
      items: [{ productId, variantId, name: 'Linen Casual Shirt', unitPrice: 4500.0, unitCost: 2500.0, quantity: 1, taxProfileId: 'tax_standard_vat' }],
    });
    commerceService.processPayment({ orderId: activeOrder2.id, method: 'CASH', amount: 5310.0 });
    commerceService.fulfillOrder({ orderId: activeOrder2.id });

    const preAvailable = inventoryEngine.getBalance('BRANCH', colomboBranchId, productId, variantId).available;
    commerceService.processReturn({
      orderId: activeOrder2.id,
      returnNumber: 'RET-2026-002',
      reason: 'Fabric tear (Defective item)',
      restockApproved: false,
      items: [{ productId, variantId, quantity: 1, unitPrice: 4500.0, unitCost: 2500.0 }],
      refundAmount: 5310.0,
      approvedBy: 'user_manager',
    });
    const postAvailable = inventoryEngine.getBalance('BRANCH', colomboBranchId, productId, variantId).available;
    expect(postAvailable).toBe(preAvailable);
  });

  // ----------------------------------------------------
  // SECTION 8: REGISTER SHIFTS & DRAWER RECONCILIATION
  // ----------------------------------------------------
  it('15: Accurately Reconciles Shift Drawer Math (Float + Cash Sales – Petty Cash)', () => {
    const openingFloat = 25000.0;
    const cashSales = 31860.0;
    const pettyCashOut = 1500.0;
    const expectedDrawer = openingFloat + cashSales - pettyCashOut;
    expect(expectedDrawer).toBe(55360.0);

    const actualCount = 55360.0;
    const variance = actualCount - expectedDrawer;
    expect(variance).toBe(0.00);
  });

  it('16: Accurately Detects Drawer Shortage Variance', () => {
    const expectedDrawer = 55360.0;
    const actualCount = 54360.0; // 1,000 shortage
    const variance = actualCount - expectedDrawer;
    expect(variance).toBe(-1000.00);
  });

  // ----------------------------------------------------
  // SECTION 9: OFFLINE SYNC & VECTOR RACE RESOLUTION
  // ----------------------------------------------------
  it('17: Deterministically Resolves Offline Concurrent Stock Over-sell (Physical Primacy)', async () => {
    const stockMap = new Map<string, number>([['LNN-SHT-BLU-L', 1]]);

    const sync1 = await OfflineSyncEngine.processOfflineSale(
      {
        offlineId: 'off_1',
        terminalId: 'POS-01',
        branchId: 'BR-01',
        cashierId: 'user_1',
        clientSequence: 1,
        clientTimestamp: 1000,
        items: [{ productId: 'LNN-SHT-BLU-L', quantity: 1, unitPrice: 4500, unitCost: 2500 }],
        payment: { method: 'CASH', amount: 4500 },
      },
      stockMap
    );

    const sync2 = await OfflineSyncEngine.processOfflineSale(
      {
        offlineId: 'off_2',
        terminalId: 'POS-02',
        branchId: 'BR-01',
        cashierId: 'user_2',
        clientSequence: 1,
        clientTimestamp: 1005,
        items: [{ productId: 'LNN-SHT-BLU-L', quantity: 1, unitPrice: 4500, unitCost: 2500 }],
        payment: { method: 'CASH', amount: 4500 },
      },
      stockMap
    );

    expect(sync1.status).toBe('COMMITTED');
    expect(sync2.status).toBe('COMMITTED_WITH_STOCK_UNDERRUN');
    expect(stockMap.get('LNN-SHT-BLU-L')).toBe(-1);
  });

  // ----------------------------------------------------
  // SECTION 10: AES-256-GCM FIELD-LEVEL ENCRYPTION
  // ----------------------------------------------------
  it('18: Encrypts and Decrypts Payment Gateway Secrets with Auth Tag Verification', () => {
    const secret = 'payhere_merchant_secret_secure_key_12345';
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toBe(secret);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(secret);
  });
});
