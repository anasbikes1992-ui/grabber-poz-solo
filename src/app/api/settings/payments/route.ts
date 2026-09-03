import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, businessConfig } from '@/db';
import { assertRole, getSession } from '@/lib/auth/session';
import { encryptSecret } from '@/lib/security/encryption';
import type { PaymentGatewayId } from '@/lib/payments/payment-types';

export interface GatewaySetting {
  id: PaymentGatewayId;
  name: string;
  enabled: boolean;
  mode: 'sandbox' | 'live';
  posEnabled: boolean;
  storefrontEnabled: boolean;
  merchantId?: string;
  hasSecret: boolean;
}

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      assertRole(session, ['OWNER', 'ADMIN', 'MANAGER']);
    }

    const rows = await db.select().from(businessConfig).limit(1);
    const config = (rows[0]?.configJson as Record<string, any>) || {};
    const paymentConfigs = config.paymentGateways || {};
    const encrypted = (config.encryptedSecrets || {}) as Record<string, string>;

    const defaultGateways: PaymentGatewayId[] = [
      'COD',
      'PAYHERE',
      'WEBXPAY',
      'KOKO',
      'MINTPAY',
      'PAYZY',
    ];

    const displayNames: Record<PaymentGatewayId, string> = {
      COD: 'Cash on Delivery / Counter Cash',
      PAYHERE: 'PayHere Online Gateway',
      WEBXPAY: 'WebXPay E-Commerce Gateway',
      KOKO: 'Koko Buy Now Pay Later',
      MINTPAY: 'Mintpay Shop Now Pay Later',
      PAYZY: 'Payzy Digital Installments',
    };

    const result: GatewaySetting[] = defaultGateways.map((id) => {
      const saved = paymentConfigs[id] || {};
      const secretKey = `${id.toLowerCase()}_secret`;
      const hasSecret = Boolean(encrypted[secretKey] || process.env[`${id}_SECRET`] || process.env[`${id}_API_KEY`]);

      return {
        id,
        name: saved.displayName || displayNames[id],
        enabled: saved.enabled ?? (id === 'COD'),
        mode: saved.mode || 'sandbox',
        posEnabled: saved.posEnabled ?? (id === 'COD' || id === 'KOKO' || id === 'MINTPAY'),
        storefrontEnabled: saved.storefrontEnabled ?? true,
        merchantId: saved.merchantId || '',
        hasSecret,
      };
    });

    return NextResponse.json({ success: true, gateways: result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      assertRole(session, ['OWNER', 'ADMIN']);
    }

    const body = await req.json();
    const { gatewayId, enabled, mode, displayName, posEnabled, storefrontEnabled, merchantId, secret } = body;

    if (!gatewayId) {
      return NextResponse.json({ success: false, error: 'gatewayId is required' }, { status: 400 });
    }

    const rows = await db.select().from(businessConfig).limit(1);
    const existing = rows[0];
    const prevConfig = (existing?.configJson as Record<string, any>) || {};
    const prevPaymentConfigs = prevConfig.paymentGateways || {};
    const prevSecrets = (prevConfig.encryptedSecrets as Record<string, string>) || {};

    const updatedSecrets = { ...prevSecrets };
    if (secret && typeof secret === 'string' && !secret.includes('•')) {
      updatedSecrets[`${String(gatewayId).toLowerCase()}_secret`] = encryptSecret(secret);
    }

    const updatedGateway = {
      ...(prevPaymentConfigs[gatewayId] || {}),
      ...(enabled !== undefined ? { enabled: Boolean(enabled) } : {}),
      ...(mode ? { mode: mode === 'live' ? 'live' : 'sandbox' } : {}),
      ...(displayName ? { displayName: String(displayName) } : {}),
      ...(posEnabled !== undefined ? { posEnabled: Boolean(posEnabled) } : {}),
      ...(storefrontEnabled !== undefined ? { storefrontEnabled: Boolean(storefrontEnabled) } : {}),
      ...(merchantId ? { merchantId: String(merchantId) } : {}),
    };

    const newConfig = {
      ...prevConfig,
      paymentGateways: {
        ...prevPaymentConfigs,
        [gatewayId]: updatedGateway,
      },
      encryptedSecrets: updatedSecrets,
    };

    if (existing) {
      await db
        .update(businessConfig)
        .set({ configJson: newConfig, updatedAt: new Date() })
        .where(eq(businessConfig.id, existing.id));
    } else {
      await db.insert(businessConfig).values({ configJson: newConfig });
    }

    return NextResponse.json({
      success: true,
      message: `Gateway ${gatewayId} configuration updated securely`,
      gateway: updatedGateway,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
