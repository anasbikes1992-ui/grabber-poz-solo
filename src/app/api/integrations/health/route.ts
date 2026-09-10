import { NextResponse } from 'next/server';
import { db, businessConfig } from '@/db';
import { getSession } from '@/lib/auth/session';

export type IntegrationServiceId = 'payhere' | 'whatsapp' | 'creative' | 'storage' | 'gemini' | 'koombiyo';

export type IntegrationHealthItem = {
  id: IntegrationServiceId;
  name: string;
  configured: boolean;
  status: 'LIVE' | 'FALLBACK' | 'UNCONFIGURED' | 'SIMULATION';
  source: 'ENV' | 'DATABASE' | 'NONE';
  fallbackDescription: string;
  setupGuide: string;
};

export async function GET() {
  try {
    const session = await getSession();
    // Fetch stored encrypted secret keys from business_config
    const rows = await db.select().from(businessConfig).limit(1);
    const cfg = (rows[0]?.configJson as Record<string, unknown> | undefined) || {};
    const encryptedSecrets = (cfg.encryptedSecrets as Record<string, string> | undefined) || {};

    // 1. PayHere Gateway
    const hasPayHereEnv = Boolean(process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_SECRET);
    const hasPayHereDb = Boolean(cfg.payhereMerchantId && encryptedSecrets.payhereSecret);
    const payhereConfigured = hasPayHereEnv || hasPayHereDb;

    const payhere: IntegrationHealthItem = {
      id: 'payhere',
      name: 'PayHere Online Gateway',
      configured: payhereConfigured,
      status: payhereConfigured ? 'LIVE' : 'FALLBACK',
      source: hasPayHereEnv ? 'ENV' : hasPayHereDb ? 'DATABASE' : 'NONE',
      fallbackDescription: payhereConfigured
        ? 'Online credit/debit card checkout is active via PayHere.'
        : 'PayHere credentials unconfigured. Storefront online checkout falls back gracefully to Cash on Delivery (COD).',
      setupGuide: 'Add PayHere Merchant ID and Secret in Settings → Integrations.',
    };

    // 2. WhatsApp Cloud API
    const hasWaEnv = Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
    const hasWaDb = Boolean(cfg.whatsappPhoneId && encryptedSecrets.whatsappToken);
    const waConfigured = hasWaEnv || hasWaDb;

    const whatsapp: IntegrationHealthItem = {
      id: 'whatsapp',
      name: 'WhatsApp Business Cloud API',
      configured: waConfigured,
      status: waConfigured ? 'LIVE' : 'UNCONFIGURED',
      source: hasWaEnv ? 'ENV' : hasWaDb ? 'DATABASE' : 'NONE',
      fallbackDescription: waConfigured
        ? 'Direct automated receipts, abandoned cart reminders, and customer messages are live.'
        : 'WhatsApp API credentials missing. Customer messages are queued locally but cannot be dispatched automatically.',
      setupGuide: 'Configure Meta WhatsApp Phone Number ID and System User Access Token.',
    };

    // 3. Creative AI Engine (FAL.ai / Replicate)
    const hasFalKey = Boolean(process.env.FAL_KEY);
    const hasReplicate = Boolean(process.env.REPLICATE_API_TOKEN);
    const creativeConfigured = hasFalKey || hasReplicate;

    const creative: IntegrationHealthItem = {
      id: 'creative',
      name: 'Creative Studio AI Engine',
      configured: creativeConfigured,
      status: creativeConfigured ? 'LIVE' : 'SIMULATION',
      source: hasFalKey || hasReplicate ? 'ENV' : 'NONE',
      fallbackDescription: creativeConfigured
        ? `Cloud AI generation active (${hasFalKey ? 'FAL.ai' : 'Replicate'}).`
        : 'AI generation API key (FAL_KEY) not set. Creative Studio operates in queue simulation and template preview mode.',
      setupGuide: 'Set FAL_KEY in server environment to enable high-resolution AI video and product photo generation.',
    };

    // 4. Storage Provider (Supabase vs Local)
    const hasSupabaseStorage = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const storage: IntegrationHealthItem = {
      id: 'storage',
      name: 'Media & Asset Storage',
      configured: true,
      status: hasSupabaseStorage ? 'LIVE' : 'FALLBACK',
      source: hasSupabaseStorage ? 'ENV' : 'NONE',
      fallbackDescription: hasSupabaseStorage
        ? 'Supabase Cloud Object Storage active (S3-compatible bucket).'
        : 'Local filesystem storage active. For multi-instance Vercel deployments, configure Supabase Storage.',
      setupGuide: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    };

    // 5. Gemini AI Engine (Jarvis)
    const hasGeminiEnv = Boolean(process.env.GEMINI_API_KEY);
    const hasGeminiDb = Boolean(encryptedSecrets.geminiApiKey);
    const geminiConfigured = hasGeminiEnv || hasGeminiDb;

    const gemini: IntegrationHealthItem = {
      id: 'gemini',
      name: 'Jarvis Commerce Copilot (Gemini AI)',
      configured: geminiConfigured,
      status: geminiConfigured ? 'LIVE' : 'UNCONFIGURED',
      source: hasGeminiEnv ? 'ENV' : hasGeminiDb ? 'DATABASE' : 'NONE',
      fallbackDescription: geminiConfigured
        ? 'Gemini 1.5 Pro / Flash reasoning engine connected for Jarvis copilot and agent squad.'
        : 'Gemini API key missing. Jarvis copilot fallback rules and direct SQL assistance active.',
      setupGuide: 'Add Gemini API Key in Settings → Integrations.',
    };

    // 6. Courier / Logistics (Koombiyo)
    const hasKoombiyo = Boolean(process.env.KOOMBIYO_API_KEY || encryptedSecrets.koombiyoApiKey);
    const koombiyo: IntegrationHealthItem = {
      id: 'koombiyo',
      name: 'Koombiyo Logistics Courier',
      configured: hasKoombiyo,
      status: hasKoombiyo ? 'LIVE' : 'FALLBACK',
      source: hasKoombiyo ? (process.env.KOOMBIYO_API_KEY ? 'ENV' : 'DATABASE') : 'NONE',
      fallbackDescription: hasKoombiyo
        ? 'Koombiyo courier dispatch and waybill generation active.'
        : 'In-house driver delivery active (Koombiyo auto-dispatch disabled).',
      setupGuide: 'Add Koombiyo API Key in Settings → Integrations.',
    };

    const services = [payhere, whatsapp, creative, storage, gemini, koombiyo];
    const warningsCount = services.filter((s) => s.status === 'UNCONFIGURED' || s.status === 'SIMULATION').length;

    return NextResponse.json({
      success: true,
      services,
      warningsCount,
      summary: {
        total: services.length,
        live: services.filter((s) => s.status === 'LIVE').length,
        fallback: services.filter((s) => s.status === 'FALLBACK').length,
        unconfigured: services.filter((s) => s.status === 'UNCONFIGURED' || s.status === 'SIMULATION').length,
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || 'Failed to check integration health' },
      { status: 500 },
    );
  }
}
