import { NextResponse } from 'next/server';
import { db, businessConfig, auditLogs, companyLeads } from '@/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';
import { runCompanyLeadSubmittedAutomation } from '@/lib/company/whatsapp-automation';

export interface CompanyLeadInput {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  businessType?: string;
  branchCount?: string;
  message?: string;
}

const companyLeadSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[+0-9][0-9\s().-]{6,24}$/, 'Please provide a valid phone number.'),
  email: z.string().trim().email().max(254),
  businessType: z.string().trim().max(80).optional(),
  branchCount: z.string().trim().max(40).optional(),
  message: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    // Honeypot: the hidden "website" field is only ever filled by bots. Pretend success, store nothing.
    if (typeof raw?.website === 'string' && raw.website.trim() !== '') {
      return NextResponse.json({ success: true, message: 'Thanks, we will be in touch.' });
    }
    if (!raw?.businessName?.trim?.() || !raw?.ownerName?.trim?.() || !raw?.phone?.trim?.() || !raw?.email?.trim?.()) {
      return validationErrorResponse('Please provide your business name, owner name, phone, and email.');
    }
    const parsed = companyLeadSchema.safeParse(raw);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message || 'Please check the form and try again.');
    }
    const body = parsed.data;

    let leadId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const leadRecord = {
      id: leadId,
      businessName: body.businessName,
      ownerName: body.ownerName,
      phone: body.phone,
      email: body.email.toLowerCase(),
      businessType: body.businessType || 'General Retail',
      branchCount: body.branchCount || '1',
      message: body.message || '',
      status: 'NEW',
      source: 'company_landing',
      notes: '',
      nextAction: null,
      createdAt: now,
      updatedAt: now,
      lastContactedAt: null,
    };

    try {
      const [lead] = await db
        .insert(companyLeads)
        .values({
          businessName: leadRecord.businessName,
          ownerName: leadRecord.ownerName,
          phone: leadRecord.phone,
          email: leadRecord.email,
          businessType: leadRecord.businessType,
          branchCount: leadRecord.branchCount,
          message: leadRecord.message,
          status: leadRecord.status,
          source: leadRecord.source,
        })
        .returning({ id: companyLeads.id });
      if (lead?.id) leadId = lead.id;
    } catch (err) {
      console.error('Company lead table write failed; falling back to config JSON', err);
    }

    // Legacy backup store in businessConfig configJson under commercial leads list.
    try {
      const [row] = await db.select().from(businessConfig).limit(1);
      if (row) {
        const cfg = (row.configJson || {}) as Record<string, any>;
        const leads = (cfg.commercialLeads as Array<any> | undefined) || [];
        leads.push({ ...leadRecord, id: leadId });

        await db
          .update(businessConfig)
          .set({
            configJson: { ...cfg, commercialLeads: leads },
            updatedAt: new Date(),
          })
          .where(eq(businessConfig.id, row.id));
      }
    } catch {
      /* ignore DB write failure in transient states */
    }

    // Write audit record
    try {
      await db.insert(auditLogs).values({
        action: 'COMPANY_LEAD_SUBMITTED',
        entity: 'commercial_lead',
        entityId: leadId,
        afterState: { ...leadRecord, id: leadId },
      });
    } catch {
      /* ignore audit write failure */
    }

    try {
      await runCompanyLeadSubmittedAutomation({ ...leadRecord, id: leadId });
    } catch (err) {
      console.error('Company WhatsApp lead automation failed', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! The Grabber POZ team will contact you shortly to schedule your demo.',
      leadId,
    });
  } catch (err: unknown) {
    return publicErrorResponse(err, { message: 'Could not submit inquiry', logMessage: 'Company lead submission failed' });
  }
}
