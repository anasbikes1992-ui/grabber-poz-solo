import { describe, it, expect } from 'vitest';
import { TaxEngine } from '../src/lib/commerce/tax-engine';
import { PricingEngine } from '../src/lib/commerce/pricing-engine';
import { InventoryEngine } from '../src/lib/commerce/inventory-engine';
import { CreditEngine } from '../src/lib/commerce/credit-engine';
import { AccountingEngine } from '../src/lib/commerce/accounting-engine';
import { PurchasingEngine } from '../src/lib/commerce/purchasing-engine';
import { CommerceService } from '../src/lib/commerce/commerce-service';
import { JarvisToolRegistry } from '../src/lib/ai/jarvis-tools';
import { CreativeEngine } from '../src/lib/creative/creative-engine';
import { BackupService } from '../src/lib/backup/backup-service';
import { DEFAULT_CONFIGS } from '../src/lib/config/business-config';

describe('GRABBER BUSINESS OS — THE GOLDEN BUSINESS E2E TEST', () => {
  // Initialize isolated subsystem instances
  const taxEngine = new TaxEngine();
  const pricingEngine = new PricingEngine(taxEngine);
  const inventoryEngine = new InventoryEngine();
  const creditEngine = new CreditEngine();
  const accountingEngine = new AccountingEngine();
  const purchasingEngine = new PurchasingEngine(inventoryEngine, accountingEngine);
  const commerceService = new CommerceService(taxEngine, pricingEngine, inventoryEngine, creditEngine, accountingEngine);
  const jarvis = new JarvisToolRegistry(commerceService, inventoryEngine, creditEngine, accountingEngine);
  const creativeEngine = new CreativeEngine();

  // Test State Context
  const businessConfig = DEFAULT_CONFIGS.FASHION;
  const centralWarehouseId = 'wh_central_colombo';
  const colomboBranchId = 'br_colombo_main';
  const kandyBranchId = 'br_kandy_outlet';
  const supplierId = 'sup_textiles_ltd';
  const customerId = 'cust_sarath_perera';
  const productId = 'prod_linen_shirt';

  it('Step 1: Onboards Business with Fashion Vertical Configuration', () => {
    expect(businessConfig.vertical).toBe('FASHION');
    expect(businessConfig.features?.variants.enabled).toBe(true);
    expect(businessConfig.features?.creditSalesPolimPotha.enabled).toBe(true);
  });

  it('Step 2: Configures Effective-Dated Tax Profiles', () => {
    taxEngine.registerRate({
      id: 'rate_vat_18',
      taxProfileId: 'tax_standard_vat',
      name: 'VAT 18%',
      ratePercentage: 18.0,
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null,
    });

    const activeRate = taxEngine.resolveActiveRate('tax_standard_vat', new Date());
    expect(activeRate).not.toBeNull();
    expect(activeRate?.ratePercentage).toBe(18.0);
  });

  it('Step 3: Creates Purchase Order and Receives GRN into Central Warehouse', () => {
    // Create PO for 100 shirts @ cost LKR 2,500
    const po = purchasingEngine.createPurchaseOrder({
      poNumber: 'PO-2026-001',
      supplierId,
      supplierName: 'Lanka Textiles Ltd',
      warehouseId: centralWarehouseId,
      warehouseName: 'Central Colombo Warehouse',
      items: [
        {
          productId,
          variantId: 'size_L_blue',
          productName: 'Linen Casual Shirt - L Blue',
          quantity: 100,
          unitCost: 2500.0,
        },
      ],
      createdBy: 'user_admin',
    });

    expect(po.totalAmount).toBe(250000.0);

    // Receive full GRN
    const { grn, po: updatedPO } = purchasingEngine.receiveGRN({
      poIdOrNumber: po.id,
      grnNumber: 'GRN-2026-001',
      items: [
        {
          productId,
          variantId: 'size_L_blue',
          receivedQty: 100,
          unitCost: 2500.0,
        },
      ],
      receivedBy: 'user_warehouse_lead',
    });

    expect(updatedPO.status).toBe('RECEIVED');
    expect(grn.totalReceivedCost).toBe(250000.0);

    // Verify Central Warehouse stock balance
    const whStock = inventoryEngine.getBalance('WAREHOUSE', centralWarehouseId, productId, 'size_L_blue');
    expect(whStock.onHand).toBe(100);
    expect(whStock.available).toBe(100);
  });

  it('Step 4: Executes Inter-Location Stock Transfer (Central WH -> Colombo Branch)', () => {
    const transferResult = commerceService.transferStock({
      transferNumber: 'TRF-2026-001',
      fromLocationType: 'WAREHOUSE',
      fromLocationId: centralWarehouseId,
      toLocationType: 'BRANCH',
      toLocationId: colomboBranchId,
      items: [
        {
          productId,
          variantId: 'size_L_blue',
          quantity: 40,
          unitCost: 2500.0,
        },
      ],
      actorId: 'user_manager',
    });

    expect(transferResult.sourceBalances[0].onHand).toBe(60); // 100 - 40
    expect(transferResult.targetBalances[0].onHand).toBe(40); // 0 + 40
  });

  it('Step 5: Executes Counter POS Sale (Cash + Card Split Tender)', () => {
    // 2 shirts @ LKR 4,500 each, VAT 18%
    const order = commerceService.createOrder({
      orderNumber: 'POS-2026-1001',
      channel: 'POS',
      fulfillmentLocationType: 'BRANCH',
      fulfillmentLocationId: colomboBranchId,
      branchId: colomboBranchId,
      registerId: 'reg_colombo_01',
      items: [
        {
          productId,
          variantId: 'size_L_blue',
          name: 'Linen Casual Shirt - L Blue',
          unitPrice: 4500.0,
          unitCost: 2500.0,
          quantity: 2,
          taxProfileId: 'tax_standard_vat',
        },
      ],
      actorId: 'user_cashier',
    });

    // Subtotal: 9000, Tax 18%: 1620, Grand Total: 10620
    expect(order.pricing.subtotal).toBe(9000.0);
    expect(order.pricing.taxTotal).toBe(1620.0);
    expect(order.pricing.grandTotal).toBe(10620.0);

    // Reserved count should be 2 at Colombo Branch
    const reservedBalance = inventoryEngine.getBalance('BRANCH', colomboBranchId, productId, 'size_L_blue');
    expect(reservedBalance.reserved).toBe(2);
    expect(reservedBalance.available).toBe(38); // 40 - 2

    // Pay: LKR 5,000 Cash + LKR 5,620 Card
    commerceService.processPayment({
      orderId: order.id,
      method: 'CASH',
      amount: 5000.0,
      actorId: 'user_cashier',
    });

    const paymentRes = commerceService.processPayment({
      orderId: order.id,
      method: 'CARD',
      amount: 5620.0,
      providerRef: 'AUTH_CARD_987654',
      actorId: 'user_cashier',
    });

    expect(paymentRes.order.paymentStatus).toBe('PAID');

    // Fulfill POS order immediately
    const fulfilledOrder = commerceService.fulfillOrder({
      orderId: order.id,
      actorId: 'user_cashier',
    });

    expect(fulfilledOrder.orderStatus).toBe('DELIVERED');
    expect(fulfilledOrder.fulfillmentStatus).toBe('DELIVERED');

    // Branch stock check: onHand should be 38, reserved should be 0
    const branchStock = inventoryEngine.getBalance('BRANCH', colomboBranchId, productId, 'size_L_blue');
    expect(branchStock.onHand).toBe(38);
    expect(branchStock.reserved).toBe(0);
  });

  it('Step 6: Executes Web Storefront Sale (Online Payment & Fulfillment)', () => {
    // 3 shirts @ LKR 4,500 each
    const order = commerceService.createOrder({
      orderNumber: 'WEB-2026-2001',
      channel: 'STOREFRONT',
      fulfillmentLocationType: 'BRANCH',
      fulfillmentLocationId: colomboBranchId,
      customerId: 'cust_online_buyer',
      customerName: 'Anura Kumara',
      items: [
        {
          productId,
          variantId: 'size_L_blue',
          name: 'Linen Casual Shirt - L Blue',
          unitPrice: 4500.0,
          unitCost: 2500.0,
          quantity: 3,
          taxProfileId: 'tax_standard_vat',
        },
      ],
    });

    // Pay Online: LKR 15,930
    commerceService.processPayment({
      orderId: order.id,
      method: 'ONLINE',
      amount: 15930.0,
      providerRef: 'PAYHERE_TX_554433',
    });

    expect(order.paymentStatus).toBe('PAID');

    // Fulfill web order
    commerceService.fulfillOrder({
      orderId: order.id,
      courierPartner: 'Prompt Express',
      trackingNumber: 'PRM-778899',
    });

    const branchStock = inventoryEngine.getBalance('BRANCH', colomboBranchId, productId, 'size_L_blue');
    expect(branchStock.onHand).toBe(35); // 38 - 3
  });

  it('Step 7: Executes WhatsApp Commerce Hotline Sale (COD Tender)', () => {
    const order = commerceService.createOrder({
      orderNumber: 'WA-2026-3001',
      channel: 'WHATSAPP',
      fulfillmentLocationType: 'BRANCH',
      fulfillmentLocationId: colomboBranchId,
      customerId: 'cust_wa_buyer',
      customerName: 'Nimal Silva',
      items: [
        {
          productId,
          variantId: 'size_L_blue',
          name: 'Linen Casual Shirt - L Blue',
          unitPrice: 4500.0,
          unitCost: 2500.0,
          quantity: 1,
          taxProfileId: 'tax_standard_vat',
        },
      ],
    });

    // COD delivery fulfillment before payment
    commerceService.fulfillOrder({
      orderId: order.id,
      courierPartner: 'Koombiyo',
      trackingNumber: 'KMB-112233',
    });

    // Payment collected upon delivery
    commerceService.processPayment({
      orderId: order.id,
      method: 'COD',
      amount: 5310.0,
      providerRef: 'KMB_REMIT_443322',
    });

    const branchStock = inventoryEngine.getBalance('BRANCH', colomboBranchId, productId, 'size_L_blue');
    expect(branchStock.onHand).toBe(34); // 35 - 1
  });

  it('Step 8: Executes Polim Potha Credit Sale & Customer Repayment (AR Subsystem)', () => {
    // Set customer credit limit to LKR 50,000
    creditEngine.setAccount({
      customerId,
      customerName: 'Sarath Perera',
      creditLimit: 50000.0,
      currentBalance: 0,
      availableCredit: 50000.0,
      status: 'ACTIVE',
    });

    // 4 shirts on credit: LKR 21,240
    const order = commerceService.createOrder({
      orderNumber: 'POS-2026-1002',
      channel: 'POS',
      fulfillmentLocationType: 'BRANCH',
      fulfillmentLocationId: colomboBranchId,
      customerId,
      customerName: 'Sarath Perera',
      items: [
        {
          productId,
          variantId: 'size_L_blue',
          name: 'Linen Casual Shirt - L Blue',
          unitPrice: 4500.0,
          unitCost: 2500.0,
          quantity: 4,
          taxProfileId: 'tax_standard_vat',
        },
      ],
      actorId: 'user_cashier',
    });

    const creditPayment = commerceService.processPayment({
      orderId: order.id,
      method: 'CREDIT',
      amount: 21240.0,
      authorizingUserRole: 'CASHIER',
      actorId: 'user_cashier',
    });

    expect(creditPayment.polimPothaEntry?.type).toBe('INVOICE');
    expect(creditPayment.polimPothaEntry?.amount).toBe(21240.0);

    commerceService.fulfillOrder({ orderId: order.id });

    // Check Customer Account & Aging
    const account = creditEngine.getAccount(customerId);
    expect(account.currentBalance).toBe(21240.0);
    expect(account.availableCredit).toBe(28760.0); // 50000 - 21240

    const aging = creditEngine.getAgingReport(customerId);
    expect(aging.days0to30).toBe(21240.0);

    // Customer makes a partial cash repayment of LKR 10,000
    creditEngine.postEntry({
      customerId,
      type: 'REPAYMENT',
      amount: 10000.0,
      notes: 'Cash payment at counter',
      createdBy: 'user_cashier',
    });

    accountingEngine.recordCustomerRepayment({
      receiptNumber: 'REC-2026-001',
      amount: 10000.0,
      customerId,
      paymentMethod: 'CASH',
      createdBy: 'user_cashier',
    });

    const updatedAccount = creditEngine.getAccount(customerId);
    expect(updatedAccount.currentBalance).toBe(11240.0); // 21240 - 10000

    // Verify Polim Potha invariant
    const invCheck = creditEngine.verifyCreditInvariant(customerId);
    expect(invCheck.isValid).toBe(true);
    expect(invCheck.computedBalance).toBe(11240.0);
  });

  it('Step 9: Executes Item Return & Refund with Branch Restocking', () => {
    // Return 1 shirt from POS-2026-1001 (Sale price 4,500 + 18% VAT = 5,310)
    const returnRes = commerceService.processReturn({
      orderId: 'POS-2026-1001',
      returnNumber: 'RET-2026-001',
      reason: 'Customer size exchange',
      restockApproved: true,
      items: [
        {
          productId,
          variantId: 'size_L_blue',
          quantity: 1,
          unitPrice: 4500.0,
          unitCost: 2500.0,
        },
      ],
      refundAmount: 5310.0,
      approvedBy: 'user_manager',
    });

    expect(returnRes.order.orderStatus).toBe('RETURNED');
    expect(returnRes.order.paymentStatus).toBe('REFUNDED');

    // Branch stock should increase by 1
    const branchStock = inventoryEngine.getBalance('BRANCH', colomboBranchId, productId, 'size_L_blue');
    expect(branchStock.onHand).toBe(31); // 30 + 1 restocked
  });

  it('Step 10: Jarvis AI Copilot (Read Query & High-Risk Stock Transfer Proposal)', async () => {
    const userContext = {
      userId: 'user_owner_01',
      userName: 'Business Owner',
      role: 'OWNER' as const,
      assignedBranchIds: [colomboBranchId, kandyBranchId],
      assignedWarehouseIds: [centralWarehouseId],
    };

    // A. Read Tool (Instant Execution)
    const readResult = await jarvis.invokeTool(
      'get_stock_summary',
      { locationId: colomboBranchId, productId, variantId: 'size_L_blue' },
      userContext
    );
    expect(readResult.status).toBe('EXECUTED');
    expect(readResult.data.stock.onHand).toBe(31);

    // B. High-Risk Write Tool (Propose Stock Transfer Central WH -> Kandy Branch)
    const highRiskResult = await jarvis.invokeTool(
      'propose_stock_transfer',
      {
        fromLocationId: centralWarehouseId,
        toLocationId: kandyBranchId,
        items: [{ productId, variantId: 'size_L_blue', quantity: 15 }],
      },
      userContext
    );

    expect(highRiskResult.status).toBe('CONFIRMATION_REQUIRED');
    expect(highRiskResult.confirmationToken).toBeDefined();

    // Owner confirms proposal
    const confirmationResult = await jarvis.confirmToolExecution(highRiskResult.confirmationToken!);
    expect(confirmationResult.status).toBe('EXECUTED');

    // Verify Kandy Branch stock received 15 units
    const kandyStock = inventoryEngine.getBalance('BRANCH', kandyBranchId, productId, 'size_L_blue');
    expect(kandyStock.onHand).toBe(15);
  });

  it('Step 11: Creative Factory & Media Library Management', async () => {
    // 1. Add Brand Logo to Media Library
    const logoAsset = creativeEngine.addMediaAsset({
      title: 'Company Logo',
      assetType: 'LOGO',
      source: 'LOCAL_UPLOAD',
      fileUrl: '/assets/logo.png',
      mimeType: 'image/png',
      tags: ['branding', 'vector'],
    });

    expect(logoAsset.id).toBeDefined();

    // 2. Create Creative Project for Social Ad
    const project = creativeEngine.createProject({
      title: 'Summer Linen Promo',
      productId,
      format: 'SHORT_FORM_30S',
      aspectRatio: '9:16',
      createdBy: 'user_marketing',
    });

    expect(project.status).toBe('DRAFT');

    // 3. Verify Video Provider abstraction
    const provider = creativeEngine.getProvider('WAN21');
    expect(provider).toBeDefined();
    const clip = await provider!.generateClip('Smooth camera pan over linen fabric in sunlight', {
      durationSeconds: 5,
      aspectRatio: '9:16',
    });
    expect(clip.clipUrl).toContain('/rendered/wan21_');
  });

  it('Step 12: Generates Business Data Export & Disaster Recovery Snapshot', async () => {
    const exportSnapshot = await BackupService.exportBusinessData({
      business: { name: 'My Fashion Store', currency: 'LKR' },
      branches: [{ id: colomboBranchId, name: 'Colombo' }, { id: kandyBranchId, name: 'Kandy' }],
      warehouses: [{ id: centralWarehouseId, name: 'Central Depot' }],
      products: [{ id: productId, name: 'Linen Shirt' }],
      stockBalances: [],
      customers: [{ id: customerId, name: 'Sarath Perera' }],
      polimPothaEntries: creditEngine.getEntries(customerId),
      suppliers: [{ id: supplierId, name: 'Lanka Textiles' }],
      orders: [],
      journalEntries: accountingEngine.getEntries(),
    });

    expect(exportSnapshot.exportedAt).toBeInstanceOf(Date);
    expect(exportSnapshot.business.name).toBe('My Fashion Store');

    const csvOutput = BackupService.generateCSV([
      { code: '1010', name: 'Cash', balance: 5000 },
      { code: '1100', name: 'AR', balance: 11240 },
    ]);
    expect(csvOutput).toContain('code,name,balance');
    expect(csvOutput).toContain('"1010","Cash","5000"');
  });

  it('Step 13: Mathematical Invariant Verification (Physical Stock & Double-Entry Accounting)', () => {
    // 1. Verify Stock Ledger Invariant for Colombo Branch
    // Opening(0) + TransferIn(40) - POS(2) - Web(3) - WA(1) - Credit(4) + Restocked(1) = 31
    const colomboInvariant = inventoryEngine.verifyStockInvariant(colomboBranchId, productId, 'size_L_blue');
    expect(colomboInvariant.isValid).toBe(true);
    expect(colomboInvariant.currentOnHand).toBe(31);

    // 2. Verify Stock Ledger Invariant for Central Warehouse
    // Opening(0) + GRN(100) - TransferOut(40) - TransferOut(15) = 45
    const whInvariant = inventoryEngine.verifyStockInvariant(centralWarehouseId, productId, 'size_L_blue');
    expect(whInvariant.isValid).toBe(true);
    expect(whInvariant.currentOnHand).toBe(45);

    // 3. Verify Universal Accounting Ledger Double-Entry Invariant across ALL Journal Entries
    const acctInvariant = accountingEngine.verifyUniversalAccountingInvariant();
    expect(acctInvariant.isValid).toBe(true);
    expect(acctInvariant.difference).toBe(0);
    expect(acctInvariant.totalDebits).toBe(acctInvariant.totalCredits);
    expect(acctInvariant.entryCount).toBeGreaterThan(0);
  });
});
