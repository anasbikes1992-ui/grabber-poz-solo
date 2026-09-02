import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  branches,
  businessConfig,
  businessProfile,
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
import { hashPin } from '@/lib/auth/session';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { REQUIRED_COA } from '@/lib/commerce/ensure-coa';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    // Allow unauthenticated seed only in non-production
    if (process.env.NODE_ENV === 'production') {
      assertCanMutateCommerce(session);
      if (session && session.role !== 'OWNER' && session.role !== 'ADMIN') {
        return NextResponse.json({ success: false, error: 'OWNER required to seed' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const storeName = body.storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Solo Store';

    const result = await db.transaction(async (tx) => {
      const [profile] = await tx
        .insert(businessProfile)
        .values({
          name: storeName,
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
        await tx
          .insert(registers)
          .values({ branchId, name: 'Register 1', code: 'REG-01' })
          .onConflictDoNothing();
        await tx
          .insert(warehouses)
          .values({ branchId, name: 'Main Warehouse', code: 'WH-MAIN' })
          .onConflictDoNothing();
      }

      const ownerEmail = body.ownerEmail || `owner@${(body.slug || 'solo').toLowerCase()}.local`;
      const [owner] = await tx
        .insert(users)
        .values({
          email: ownerEmail,
          name: 'Store Owner',
          role: 'OWNER',
          hashedPin: hashPin(body.ownerPin || '1234'),
          active: true,
        })
        .onConflictDoNothing()
        .returning()
        .catch(async () => tx.select().from(users).where(eq(users.email, ownerEmail)).limit(1));

      // Demo catalog products
      const demoProducts = [
        { sku: 'DEMO-SHIRT-L', slug: 'demo-linen-shirt', name: 'Linen Casual Shirt', sale: '4500.00', cost: '2500.00' },
        { sku: 'DEMO-OXFORD-M', slug: 'demo-oxford-shirt', name: 'Oxford Button-Down', sale: '5200.00', cost: '2800.00' },
        { sku: 'DEMO-CHINO-32', slug: 'demo-chino', name: 'Stretch Chino Trousers', sale: '6500.00', cost: '3400.00' },
        { sku: 'DEMO-POLO-XL', slug: 'demo-polo', name: 'Pique Cotton Polo', sale: '3800.00', cost: '1900.00' },
      ];

      const seededProducts = [];
      for (const p of demoProducts) {
        const [prod] = await tx
          .insert(products)
          .values({
            name: p.name,
            sku: p.sku,
            slug: p.slug,
            salePrice: p.sale,
            costPrice: p.cost,
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
              onHand: 50,
              reserved: 0,
              damaged: 0,
            })
            .onConflictDoNothing();
          seededProducts.push(prod);
        }
      }

      // Demo supplier + APPROVED PO for GRN UI (PO-2026-002)
      let demoPo: { id: string; poNumber: string } | null = null;
      const [wh] = await tx.select().from(warehouses).limit(1);
      const oxford = seededProducts.find((p) => p.sku === 'DEMO-OXFORD-M') || seededProducts[0];
      if (wh && oxford) {
        let [supplier] = await tx
          .select()
          .from(suppliers)
          .where(eq(suppliers.phone, '+94770000001'))
          .limit(1);
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
                createdBy: owner?.id || null,
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

      // Demo credit customer for Polim Potha
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

      // Enable all vertical flags for demo / onboarding
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
        ownerId: owner?.id,
        ownerEmail,
        products: seededProducts.map((p) => ({ id: p.id, sku: p.sku, name: p.name })),
        purchaseOrder: demoPo,
        customer: demoCustomer,
        note: isDemoUserId(session?.userId || '') ? 'demo-session' : 'ok',
      };
    });

    return NextResponse.json({ success: true, seeded: result });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      {
        success: false,
        error: e.message || 'Seed failed',
        hint: 'Ensure DATABASE_URL points to a schema matching src/db/schema.ts (npm run db:push)',
      },
      { status: 500 }
    );
  }
}
