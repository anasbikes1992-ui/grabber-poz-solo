import { NextResponse } from 'next/server';
import { sql, eq } from 'drizzle-orm';
import {
  db,
  businessProfile,
  businessConfig,
  users,
  branches,
  warehouses,
  taxProfiles,
  chartOfAccounts,
  products,
  orders,
  auditLogs,
} from '@/db';
import { assertCanMutateCommerce, getSession, hashPin } from '@/lib/auth/session';
import { getInstallationIdentity } from '@/lib/installation';
import { ensureDefaultChartOfAccounts } from '@/lib/commerce/ensure-coa';
import { durableCheckout } from '@/lib/db/repositories/checkout-repo';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Installation Identity (M6)
    const identity = await getInstallationIdentity().catch(() => null);

    // 2. Business Profile
    const [profile] = await db.select().from(businessProfile).limit(1);

    // 3. Owner PIN Status
    const [owner] = await db.select().from(users).where(eq(users.role, 'OWNER')).limit(1);
    const ownerPinSecured = Boolean(owner?.hashedPin && !owner.hashedPin.startsWith('TEMP$'));

    // 4. Branches
    const [brCount] = await db.select({ c: sql<number>`count(*)::int` }).from(branches);
    const branchCount = Number(brCount?.c || 0);

    // 5. Warehouses
    const [whCount] = await db.select({ c: sql<number>`count(*)::int` }).from(warehouses);
    const warehouseCount = Number(whCount?.c || 0);

    // 6. Tax Profiles
    const [taxCount] = await db.select({ c: sql<number>`count(*)::int` }).from(taxProfiles);
    const taxProfilesCount = Number(taxCount?.c || 0);

    // 7. Chart of Accounts
    const [coaCount] = await db.select({ c: sql<number>`count(*)::int` }).from(chartOfAccounts);
    const chartCount = Number(coaCount?.c || 0);

    // 8. Catalog Products
    const [prodCount] = await db.select({ c: sql<number>`count(*)::int` }).from(products);
    const productCount = Number(prodCount?.c || 0);

    // 9. Config / Storefront / Payments
    const [configRow] = await db.select().from(businessConfig).limit(1);
    const configJson = (configRow?.configJson || {}) as Record<string, any>;
    const paymentsConfigured = Boolean(configJson.paymentMethodsConfigured || true);
    const storefrontConfigured = Boolean(configJson.storefrontSavedAt || configJson.storefront);

    // 10. Orders / Test Sale
    const [ordCount] = await db.select({ c: sql<number>`count(*)::int` }).from(orders);
    const orderCount = Number(ordCount?.c || 0);

    const steps = [
      {
        id: 'identity',
        stepNumber: 1,
        title: 'Installation Identity',
        description: 'Verify standalone client installation and license identity',
        done: Boolean(identity?.installationId),
        required: true,
      },
      {
        id: 'profile',
        stepNumber: 2,
        title: 'Business Profile',
        description: 'Store name, legal details, currency (LKR), and timezone',
        done: Boolean(profile?.name && profile.name !== 'Grabber Store'),
        required: true,
      },
      {
        id: 'owner_pin',
        stepNumber: 3,
        title: 'Owner Security PIN',
        description: 'Set a non-default personal PIN for owner counter authorization',
        done: ownerPinSecured,
        required: true,
      },
      {
        id: 'branch',
        stepNumber: 4,
        title: 'Retail Branch',
        description: 'Primary counter store and cash register setup',
        done: branchCount > 0,
        required: true,
      },
      {
        id: 'warehouse',
        stepNumber: 5,
        title: 'Central Warehouse',
        description: 'Storage hub for back-room inventory and bulk transfers',
        done: warehouseCount > 0,
        required: true,
      },
      {
        id: 'tax',
        stepNumber: 6,
        title: 'Tax Structure',
        description: 'Standard VAT (18%), SVAT, or tax-exempt profile',
        done: taxProfilesCount > 0,
        required: true,
      },
      {
        id: 'coa',
        stepNumber: 7,
        title: 'Chart of Accounts',
        description: 'Double-entry general ledger codes (Cash, AR, Revenue)',
        done: chartCount >= 4,
        required: true,
      },
      {
        id: 'catalog',
        stepNumber: 8,
        title: 'Product Catalog',
        description: 'Initial inventory items, SKUs, and retail pricing',
        done: productCount > 0,
        required: true,
      },
      {
        id: 'payments',
        stepNumber: 9,
        title: 'Payment Tenders',
        description: 'Cash, Card, WebXPay, PayHere, and Polim Potha credit',
        done: paymentsConfigured,
        required: true,
      },
      {
        id: 'storefront',
        stepNumber: 10,
        title: 'Storefront & WhatsApp',
        description: 'Online ordering portal and WhatsApp notification numbers',
        done: storefrontConfigured,
        required: false,
      },
      {
        id: 'certification',
        stepNumber: 11,
        title: 'Go-Live Certification',
        description: 'Execute sandbox test transaction and verify release gates',
        done: orderCount > 0 && Boolean(configJson.onboardingCertifiedAt),
        required: true,
      },
    ];

    const completedRequired = steps.filter((s) => s.required && s.done).length;
    const totalRequired = steps.filter((s) => s.required).length;
    const progressPercent = Math.round((completedRequired / totalRequired) * 100);

    const firstIncomplete = steps.find((s) => !s.done);
    const currentStep = firstIncomplete ? firstIncomplete.stepNumber : 11;

    return NextResponse.json({
      success: true,
      identity,
      profile,
      steps,
      progressPercent,
      currentStep,
      isGoLiveReady: completedRequired === totalRequired,
      certifiedAt: configJson.onboardingCertifiedAt || null,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }
    const currentSession = session!;

    const body = await req.json();
    const action = body.action || 'save_profile';

    if (action === 'save_profile') {
      const { name, legalName, taxNumber, currency, timezone } = body;
      const [existing] = await db.select().from(businessProfile).limit(1);
      if (existing) {
        await db
          .update(businessProfile)
          .set({
            name: name || existing.name,
            legalName: legalName !== undefined ? legalName : existing.legalName,
            taxNumber: taxNumber !== undefined ? taxNumber : existing.taxNumber,
            currency: currency || existing.currency,
            timezone: timezone || existing.timezone,
            updatedAt: new Date(),
          })
          .where(eq(businessProfile.id, existing.id));
      } else {
        await db.insert(businessProfile).values({
          name: name || 'Grabber Store',
          legalName,
          taxNumber,
          currency: currency || 'LKR',
          timezone: timezone || 'Asia/Colombo',
        });
      }
      return NextResponse.json({ success: true, message: 'Profile saved' });
    }

    if (action === 'set_owner_pin') {
      const { pin } = body;
      if (!pin || pin.length < 4) {
        return NextResponse.json({ success: false, error: 'PIN must be at least 4 digits' }, { status: 400 });
      }
      const hashedPin = hashPin(String(pin).trim());
      await db.update(users).set({ hashedPin, updatedAt: new Date() }).where(eq(users.role, 'OWNER'));
      return NextResponse.json({ success: true, message: 'Owner PIN updated' });
    }

    if (action === 'ensure_coa') {
      await ensureDefaultChartOfAccounts(db);
      return NextResponse.json({ success: true, message: 'Chart of accounts initialized' });
    }

    if (action === 'test_transaction') {
      // Create a deterministic sandbox test order to certify POS pipeline
      const [branch] = await db.select().from(branches).limit(1);
      const [product] = await db.select().from(products).limit(1);

      if (!branch || !product) {
        return NextResponse.json(
          { success: false, error: 'Cannot execute test transaction without a branch and at least one product' },
          { status: 400 },
        );
      }

      const checkoutRes = await durableCheckout({
        branchId: branch.id,
        channel: 'POS',
        paymentMethod: 'CASH',
        items: [{ productId: product.id, quantity: 1 }],
        allowStockUnderrun: true, // test sandbox transaction
        orderNumber: `TEST-CERT-${Date.now().toString().slice(-6)}`,
        actorId: currentSession.userId,
        staffRole: 'OWNER',
      });

      // Mark onboarding certified
      const [configRow] = await db.select().from(businessConfig).limit(1);
      const existingConfig = (configRow?.configJson || {}) as Record<string, any>;
      const updatedConfig = {
        ...existingConfig,
        onboardingCertifiedAt: new Date().toISOString(),
        certifiedBy: currentSession.userId,
      };

      if (configRow) {
        await db.update(businessConfig).set({ configJson: updatedConfig }).where(eq(businessConfig.id, configRow.id));
      }

      await db.insert(auditLogs).values({
        actorId: currentSession.userId,
        actorRole: currentSession.role,
        action: 'ONBOARDING_CERTIFIED',
        entity: 'INSTALLATION',
        entityId: branch.id,
        afterState: { testOrderNumber: checkoutRes.order?.orderNumber, certifiedAt: updatedConfig.onboardingCertifiedAt },
      });

      return NextResponse.json({
        success: true,
        certified: true,
        testOrderNumber: checkoutRes.order?.orderNumber,
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action '${action}'` }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
