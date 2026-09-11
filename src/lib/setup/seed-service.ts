import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  branches,
  businessConfig,
  businessProfile,
  categories,
  chartOfAccounts,
  customers,
  polimPothaAccounts,
  products,
  purchaseOrderLines,
  purchaseOrders,
  registers,
  stockBalances,
  supplierAccounts,
  suppliers,
  taxProfiles,
  taxRates,
  users,
  warehouses,
} from '@/db/schema';
import { hashPin, isDemoUserId } from '@/lib/auth/session';
import { REQUIRED_COA } from '@/lib/commerce/ensure-coa';

export type SeedInput = {
  storeName: string;
  ownerEmail: string;
  ownerPin: string;
  slug: string;
  sessionUserId?: string;
  /** When false, skips default apparel demo SKUs (use preset catalog instead). */
  includeDefaultCatalog?: boolean;
};

export type SeedResult = {
  profileId?: string;
  branchId?: string;
  ownerId?: string;
  ownerEmail: string;
  products: Array<{ id: string; sku: string; name: string }>;
  purchaseOrder: { id: string; poNumber: string } | null;
  customer: { id: string; name: string } | null;
  note: string;
};

export async function runDatabaseSeed(input: SeedInput): Promise<SeedResult> {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .insert(businessProfile)
      .values({
        name: input.storeName,
        currency: 'LKR',
        timezone: 'Asia/Colombo',
      })
      .onConflictDoNothing()
      .returning()
      .catch(async () => {
        const existing = await tx.select().from(businessProfile).limit(1);
        return existing;
      });

    for (const row of REQUIRED_COA) {
      await tx.insert(chartOfAccounts).values(row).onConflictDoNothing();
    }

    const [tax] = await tx
      .insert(taxProfiles)
      .values({ code: 'STANDARD_VAT', name: 'Standard VAT 18%' })
      .onConflictDoNothing()
      .returning()
      .catch(async () => tx.select().from(taxProfiles).where(eq(taxProfiles.code, 'STANDARD_VAT')).limit(1));

    if (tax?.id) {
      await tx.insert(taxRates).values({
        taxProfileId: tax.id,
        name: 'VAT 18%',
        ratePercentage: '18.0000',
        effectiveFrom: new Date('2024-01-01'),
      });
    }

    const [branch] = await tx
      .insert(branches)
      .values({ name: 'Main Branch', code: 'MAIN' })
      .onConflictDoNothing()
      .returning()
      .catch(async () => tx.select().from(branches).where(eq(branches.code, 'MAIN')).limit(1));

    let branchId = branch?.id;
    if (!branchId) {
      const [b] = await tx.select().from(branches).limit(1);
      branchId = b?.id;
    }

    if (branchId) {
      await tx.insert(registers).values({ branchId, name: 'Register 1', code: 'REG-01' }).onConflictDoNothing();
      await tx.insert(warehouses).values({ branchId, name: 'Main Warehouse', code: 'WH-MAIN' }).onConflictDoNothing();
    }

    // Seed all 6 official staff role profiles
    const defaultStaffUsers: Array<{
      email: string;
      name: string;
      role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAREHOUSE' | 'ACCOUNTANT' | 'MARKETING';
      pin: string;
    }> = [
      { email: input.ownerEmail || 'owner@store.local', name: 'Business Owner', role: 'OWNER', pin: input.ownerPin || '1234' },
      { email: 'manager@store.local', name: 'Store Manager', role: 'MANAGER', pin: '1234' },
      { email: 'cashier@store.local', name: 'Counter Cashier', role: 'CASHIER', pin: '1234' },
      { email: 'staff@poz.lk', name: 'Counter Cashier (Alt)', role: 'CASHIER', pin: '1234' },
      { email: 'warehouse@store.local', name: 'Warehouse Lead', role: 'WAREHOUSE', pin: '1234' },
      { email: 'accountant@store.local', name: 'Senior Accountant', role: 'ACCOUNTANT', pin: '1234' },
      { email: 'creative@store.local', name: 'Creative Producer', role: 'MARKETING', pin: '1234' },
    ];

    let ownerUser: typeof users.$inferSelect | undefined;
    for (const u of defaultStaffUsers) {
      const [inserted] = await tx
        .insert(users)
        .values({
          email: u.email,
          name: u.name,
          role: u.role,
          hashedPin: hashPin(u.pin),
          active: true,
        })
        .onConflictDoNothing()
        .returning()
        .catch(async () => tx.select().from(users).where(eq(users.email, u.email)).limit(1));

      if (u.role === 'OWNER') {
        ownerUser = inserted || (await tx.select().from(users).where(eq(users.email, u.email)).limit(1))[0];
      }
    }

    // Seed official store categories
    const categoryDefinitions = [
      { name: 'Apparel & Fashion', slug: 'apparel-fashion' },
      { name: 'Party & Balloons', slug: 'party-balloons' },
      { name: 'Tableware & Cakes', slug: 'tableware-cakes' },
      { name: 'Electronics & Gadgets', slug: 'electronics-gadgets' },
      { name: 'Grocery & Pantry', slug: 'grocery-pantry' },
      { name: 'Services & Repairs', slug: 'services-repairs' },
    ];

    const categoryMap = new Map<string, string>();
    for (const cat of categoryDefinitions) {
      const [c] = await tx
        .insert(categories)
        .values({ name: cat.name, slug: cat.slug, active: true })
        .onConflictDoNothing()
        .returning()
        .catch(async () => tx.select().from(categories).where(eq(categories.slug, cat.slug)).limit(1));
      const catId = c?.id || (await tx.select().from(categories).where(eq(categories.slug, cat.slug)).limit(1))[0]?.id;
      if (catId) {
        categoryMap.set(cat.slug, catId);
      }
    }

    const demoProducts =
      input.includeDefaultCatalog !== false
        ? [
            // Apparel & Fashion
            {
              sku: 'DEMO-SHIRT-L',
              slug: 'demo-linen-shirt',
              name: 'Linen Casual Shirt',
              sale: '4500.00',
              cost: '2500.00',
              categorySlug: 'apparel-fashion',
              stock: 45,
              imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80',
              description: '100% pure breathable organic linen casual button-up shirt.',
            },
            {
              sku: 'DEMO-OXFORD-M',
              slug: 'demo-oxford-shirt',
              name: 'Oxford Button-Down Shirt',
              sale: '5200.00',
              cost: '2800.00',
              categorySlug: 'apparel-fashion',
              stock: 32,
              imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80',
              description: 'Classic heavy cotton tailored Oxford formal shirt.',
            },
            {
              sku: 'DEMO-CHINO-32',
              slug: 'demo-chino',
              name: 'Stretch Chino Trousers',
              sale: '6500.00',
              cost: '3400.00',
              categorySlug: 'apparel-fashion',
              stock: 28,
              imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80',
              description: 'Slim fit stretch cotton chino trousers with double-stitch hem.',
            },
            {
              sku: 'DEMO-POLO-XL',
              slug: 'demo-polo',
              name: 'Pique Cotton Polo',
              sale: '3800.00',
              cost: '1900.00',
              categorySlug: 'apparel-fashion',
              stock: 50,
              imageUrl: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=600&auto=format&fit=crop&q=80',
              description: 'Classic honeycomb pique polo with rib collar.',
            },
            // Party & Balloons
            {
              sku: 'PARTY-BAL-100',
              slug: 'metallic-balloon-arch-set',
              name: 'Metallic Chrome Balloon Arch Set (100pc)',
              sale: '3200.00',
              cost: '1400.00',
              categorySlug: 'party-balloons',
              stock: 60,
              imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80',
              description: 'Premium chrome latex party balloons with decorating strip and glue dots.',
            },
            {
              sku: 'PARTY-CONFETTI',
              slug: 'foil-confetti-poppers',
              name: 'Foil Confetti Cannon Poppers (Pack of 4)',
              sale: '1850.00',
              cost: '850.00',
              categorySlug: 'party-balloons',
              stock: 75,
              imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
              description: 'Spring-loaded celebration confetti poppers for parties and anniversaries.',
            },
            // Tableware & Cakes
            {
              sku: 'CAKE-STAND-GOLD',
              slug: 'rotating-gold-cake-stand',
              name: 'Luxury Gold Crystal Cake Stand 12"',
              sale: '7500.00',
              cost: '4200.00',
              categorySlug: 'tableware-cakes',
              stock: 20,
              imageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=600&auto=format&fit=crop&q=80',
              description: 'Electroplated gold finish metal dessert display pedestal.',
            },
            {
              sku: 'TABLE-RUNNER-ROSE',
              slug: 'rose-gold-sequin-runner',
              name: 'Rose Gold Sequin Table Runner (10ft)',
              sale: '2400.00',
              cost: '1100.00',
              categorySlug: 'tableware-cakes',
              stock: 40,
              imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80',
              description: 'High density shimmering sequins for banquet and dining tables.',
            },
            // Electronics & Gadgets
            {
              sku: 'EL-IPH15-128',
              slug: 'iphone-15-128gb',
              name: 'Apple iPhone 15 (128GB - Midnight)',
              sale: '345000.00',
              cost: '315000.00',
              categorySlug: 'electronics-gadgets',
              stock: 15,
              imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
              description: 'Super Retina XDR display with Dynamic Island and 48MP main camera.',
            },
            {
              sku: 'EL-AIRPODS-PRO',
              slug: 'airpods-pro-gen2',
              name: 'AirPods Pro (2nd Gen with USB-C)',
              sale: '78000.00',
              cost: '68000.00',
              categorySlug: 'electronics-gadgets',
              stock: 25,
              imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80',
              description: 'Active Noise Cancellation and Transparency mode with MagSafe charging.',
            },
            // Grocery & Pantry
            {
              sku: 'GROC-BASMATI-5K',
              slug: 'aroma-basmati-rice-5kg',
              name: 'Royal Aroma Aged Basmati Rice 5kg',
              sale: '2450.00',
              cost: '1900.00',
              categorySlug: 'grocery-pantry',
              stock: 80,
              imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
              description: 'Long-grain fragrant aged basmati rice premium batch.',
            },
            {
              sku: 'GROC-OLIVE-1L',
              slug: 'extra-virgin-olive-oil-1l',
              name: 'Cold-Pressed Extra Virgin Olive Oil 1L',
              sale: '3900.00',
              cost: '2800.00',
              categorySlug: 'grocery-pantry',
              stock: 35,
              imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
              description: 'First cold pressed Mediterranean extra virgin olive oil.',
            },
            // Services & Repairs
            {
              sku: 'SRV-SCR-IPHONE',
              slug: 'iphone-oled-screen-replacement',
              name: 'iPhone OLED Screen Replacement Service',
              sale: '18500.00',
              cost: '9500.00',
              categorySlug: 'services-repairs',
              stock: 999,
              imageUrl: 'https://images.unsplash.com/photo-1588515724527-074a7a56616c?w=600&auto=format&fit=crop&q=80',
              description: 'Professional precision OLED screen restoration with 90-day warranty.',
            },
          ]
        : [];

    const seededProducts = [];
    for (const p of demoProducts) {
      const categoryId = categoryMap.get(p.categorySlug);
      const [prod] = await tx
        .insert(products)
        .values({
          name: p.name,
          sku: p.sku,
          slug: p.slug,
          salePrice: p.sale,
          costPrice: p.cost,
          imageUrl: p.imageUrl,
          description: p.description,
          categoryId: categoryId || null,
          isActive: true,
          taxProfileId: tax?.id,
        })
        .onConflictDoNothing()
        .returning()
        .catch(async () => tx.select().from(products).where(eq(products.sku, p.sku)).limit(1));
      if (prod && branchId) {
        await tx
          .insert(stockBalances)
          .values({
            locationType: 'BRANCH',
            locationId: branchId,
            productId: prod.id,
            onHand: p.stock ?? 50,
            reserved: 0,
            damaged: 0,
          })
          .onConflictDoNothing();
        seededProducts.push(prod);
      }
    }

    let demoPo: { id: string; poNumber: string } | null = null;
    const [wh] = await tx.select().from(warehouses).limit(1);
    const oxford = seededProducts.find((p) => p.sku === 'DEMO-OXFORD-M') || seededProducts[0];
    if (wh && oxford) {
      let [supplier] = await tx.select().from(suppliers).where(eq(suppliers.phone, '+94770000001')).limit(1);
      if (!supplier) {
        [supplier] = await tx
          .insert(suppliers)
          .values({
            name: 'Ceylon Garments Co.',
            contactName: 'Nimal Silva',
            phone: '+94770000001',
            email: 'orders@ceylongarments.example',
            active: true,
          })
          .returning();
      }
      if (supplier) {
        const [acct] = await tx
          .select()
          .from(supplierAccounts)
          .where(eq(supplierAccounts.supplierId, supplier.id))
          .limit(1);
        if (!acct) {
          await tx.insert(supplierAccounts).values({
            supplierId: supplier.id,
            currentBalance: '0.00',
            creditTermsDays: 30,
          });
        }

        const [existingPo] = await tx
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.poNumber, 'PO-2026-002'))
          .limit(1);
        if (existingPo) {
          demoPo = { id: existingPo.id, poNumber: existingPo.poNumber };
        } else {
          const [po] = await tx
            .insert(purchaseOrders)
            .values({
              poNumber: 'PO-2026-002',
              supplierId: supplier.id,
              warehouseId: wh.id,
              status: 'APPROVED',
              totalAmount: '140000.00',
              createdBy: ownerUser?.id || null,
            })
            .returning();
          if (po) {
            await tx.insert(purchaseOrderLines).values({
              poId: po.id,
              productId: oxford.id,
              orderedQty: 50,
              receivedQty: 0,
              unitCost: '2800.00',
              totalCost: '140000.00',
            });
            demoPo = { id: po.id, poNumber: po.poNumber };
          }
        }
      }
    }

    let demoCustomer: { id: string; name: string } | null = null;
    {
      const phone = '+94771234567';
      let [cust] = await tx.select().from(customers).where(eq(customers.phone, phone)).limit(1);
      const shopperPasswordHash = hashPin('1234');
      if (!cust) {
        [cust] = await tx
          .insert(customers)
          .values({
            name: 'Sarath Perera',
            phone,
            email: 'sarath@example.com',
            address: '45 Lake Road, Colombo 05',
            creditLimit: '50000.00',
            hashedPassword: shopperPasswordHash,
            active: true,
          })
          .returning();
      } else if (!cust.hashedPassword) {
        [cust] = await tx
          .update(customers)
          .set({ hashedPassword: shopperPasswordHash })
          .where(eq(customers.id, cust.id))
          .returning();
      }
      if (cust) {
        const [acct] = await tx
          .select()
          .from(polimPothaAccounts)
          .where(eq(polimPothaAccounts.customerId, cust.id))
          .limit(1);
        if (!acct) {
          await tx.insert(polimPothaAccounts).values({
            customerId: cust.id,
            creditLimit: '50000.00',
            currentBalance: '11240.00',
            status: 'ACTIVE',
          });
        }
        demoCustomer = { id: cust.id, name: cust.name };
      }
    }

    {
      const [cfg] = await tx.select().from(businessConfig).limit(1);
      const flags = {
        repairs: true,
        restaurant: true,
        hirePurchase: true,
        appointments: true,
        loyalty: true,
        wholesale: true,
        grocery: true,
        whatsapp: true,
        creative: true,
      };
      if (cfg) {
        const prev = (cfg.configJson || {}) as Record<string, unknown>;
        await tx
          .update(businessConfig)
          .set({
            configJson: { ...prev, verticalFlags: flags },
            enableTableService: true,
            enableKitchenOrders: true,
            updatedAt: new Date(),
          })
          .where(eq(businessConfig.id, cfg.id));
      } else {
        await tx.insert(businessConfig).values({
          vertical: 'fashion',
          configJson: { verticalFlags: flags },
          enableTableService: true,
          enableKitchenOrders: true,
        });
      }
    }

    return {
      profileId: profile?.id,
      branchId,
      ownerId: ownerUser?.id,
      ownerEmail: input.ownerEmail,
      products: seededProducts.map((p) => ({ id: p.id, sku: p.sku, name: p.name })),
      purchaseOrder: demoPo,
      customer: demoCustomer,
      note: isDemoUserId(input.sessionUserId || '') ? 'demo-session' : 'ok',
    };
  });
}
