import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, businessConfig } from '@/db';
import { assertRole, getSession } from '@/lib/auth/session';
import { encryptSecret } from '@/lib/security/encryption';

const SECRET_KEYS = [
  'payhereSecret',
  'whatsappToken',
  'koombiyoApiKey',
  'webxpaySecret',
  'geminiApiKey',
] as const;

function looksMasked(v: string) {
  return !v || v.includes('•') || /^x+$/i.test(v);
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertRole(session, ['OWNER', 'ADMIN']);
    }

    const body = await req.json();
    // Accept either { secrets: {...} } or flat body (legacy)
    const secrets: Record<string, string> = body.secrets || body;
    const encrypted: Record<string, string> = {};
    for (const key of SECRET_KEYS) {
      const val = secrets[key];
      if (typeof val === 'string' && val.length > 0 && !looksMasked(val)) {
        encrypted[key] = encryptSecret(val);
      }
    }

    const publicConfig =
      body.publicConfig && typeof body.publicConfig === 'object'
        ? (body.publicConfig as Record<string, unknown>)
        : {
            ...(typeof body.payhereMerchantId === 'string' ? { payhereMerchantId: body.payhereMerchantId } : {}),
            ...(typeof body.whatsappPhoneId === 'string' ? { whatsappPhoneId: body.whatsappPhoneId } : {}),
          };

    const existing = await db.select().from(businessConfig).limit(1);
    if (existing[0]) {
      const prev = (existing[0].configJson || {}) as Record<string, unknown>;
      const prevSecrets = (prev.encryptedSecrets as Record<string, string>) || {};
      await db
        .update(businessConfig)
        .set({
          configJson: {
            ...prev,
            ...publicConfig,
            encryptedSecrets: { ...prevSecrets, ...encrypted },
          },
          updatedAt: new Date(),
        })
        .where(eq(businessConfig.id, existing[0].id));
    } else {
      await db.insert(businessConfig).values({
        configJson: { ...publicConfig, encryptedSecrets: encrypted },
      });
    }

    return NextResponse.json({
      success: true,
      storedKeys: Object.keys(encrypted),
      note: 'Values stored AES-256-GCM encrypted in business_config.config_json.encryptedSecrets',
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      assertRole(session, ['OWNER', 'ADMIN']);
    }
    const rows = await db.select().from(businessConfig).limit(1);
    const secrets = ((rows[0]?.configJson as Record<string, unknown> | undefined)?.encryptedSecrets ||
      {}) as Record<string, string>;
    return NextResponse.json({
      success: true,
      keysPresent: Object.keys(secrets),
      note: 'Ciphertext only — use decrypt server-side; never return plaintext via this route',
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
