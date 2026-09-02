import { and, eq } from 'drizzle-orm';
import { db, customers } from '@/db';
import { enqueueJob } from '@/lib/jobs/outbox';
import { sendWhatsAppText } from '@/lib/integrations/whatsapp';
import { savePromotions, listPromotions } from '@/lib/config/promotions-store';
import type { PromotionRule } from '@/lib/commerce/promotion-engine';
import type { JarvisUserContext } from '@/lib/ai/jarvis-types';

const CAMPAIGN_BATCH_SIZE = 10;

async function customersForAudience(audience: string) {
  const seg = String(audience || 'ALL').trim().toUpperCase();
  if (seg === 'ALL') {
    return db.select().from(customers).where(eq(customers.active, true)).limit(100);
  }
  return db
    .select()
    .from(customers)
    .where(and(eq(customers.segment, seg), eq(customers.active, true)))
    .limit(100);
}

async function sendCampaignBatch(phones: string[], message: string) {
  let sent = 0;
  let failed = 0;
  const previews: string[] = [];

  for (let i = 0; i < phones.length; i += CAMPAIGN_BATCH_SIZE) {
    const chunk = phones.slice(i, i + CAMPAIGN_BATCH_SIZE);
    const results = await Promise.allSettled(
      chunk.map((phone) => sendWhatsAppText({ to: phone, text: message })),
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        sent += 1;
        if (previews.length < 3 && 'preview' in result.value) {
          previews.push(result.value.preview.text);
        }
      } else {
        failed += 1;
      }
    }
  }

  return { sent, failed, previews };
}

export async function executeJarvisDraftApproval(
  toolName: string,
  args: Record<string, unknown>,
  context: JarvisUserContext,
) {
  if (toolName === 'draft_promotion') {
    const name = String(args.name || 'Campaign');
    const code =
      String(args.code || name.toUpperCase().replace(/\s+/g, '-').slice(0, 12)) || `PROMO-${Date.now().toString().slice(-4)}`;
    const discountPercent = Number(args.discountPercent ?? 10);
    const rules = await listPromotions();
    const rule: PromotionRule = {
      id: `promo_${Date.now()}`,
      code,
      type: 'PERCENT',
      value: discountPercent,
      minSpend: Number(args.minSpend ?? 0),
      usageCount: 0,
      maxUsage: Number(args.maxUsage ?? 500),
      validUntil: String(args.validUntil || '2026-12-31'),
      active: true,
    };
    await savePromotions([...rules, rule]);
    return {
      status: 'PROMOTION_PUBLISHED',
      code: rule.code,
      discountPercent,
      createdBy: context.userId,
      bannerText: args.bannerText || `${name} — ${discountPercent}% off`,
    };
  }

  if (toolName === 'draft_whatsapp_message') {
    const message = String(args.message || '').trim();
    const audience = String(args.audience || 'ALL');
    if (!message) throw new Error('Message body required');

    const targets = await customersForAudience(audience);
    const phones = targets.map((c) => c.phone).filter(Boolean);

    if (phones.length > 5) {
      await enqueueJob({
        type: 'WHATSAPP_BROADCAST',
        idempotencyKey: `wa_campaign_${Date.now()}_${audience}`,
        payload: { recipients: phones, text: message },
      });
      return {
        status: 'CAMPAIGN_QUEUED',
        audience,
        targeted: targets.length,
        queued: phones.length,
      };
    }

    const { sent, failed, previews } = await sendCampaignBatch(phones, message);

    return {
      status: 'CAMPAIGN_EXECUTED',
      audience,
      targeted: targets.length,
      sent,
      failed,
      stub: sent === 0 && failed === 0 && phones.length === 0,
      previews,
    };
  }

  if (toolName === 'draft_purchase_order') {
    return {
      status: 'DRAFT_ACKNOWLEDGED',
      note: 'Purchase order draft logged — create PO from /purchasing',
      payload: args,
    };
  }

  throw new Error(`Draft tool "${toolName}" has no execute handler`);
}
