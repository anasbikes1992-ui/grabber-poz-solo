import { NextResponse } from 'next/server';
import { db, businessConfig, auditLogs } from '@/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';

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
    if (!raw?.businessName?.trim?.() || !raw?.ownerName?.trim?.() || !raw?.phone?.trim?.() || !raw?.email?.trim?.()) {
      return validationErrorResponse('Please provide your business name, owner name, phone, and email.');
    }
    const parsed = companyLeadSchema.safeParse(raw);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message || 'Please check the form and try again.');
    }
    const body = parsed.data;

    const leadId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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
      createdAt: now,
    };

    // Store in businessConfig configJson under commercial leads list
    try {
      const [row] = await db.select().from(businessConfig).limit(1);
      if (row) {
        const cfg = (row.configJson || {}) as Record<string, any>;
        const leads = (cfg.commercialLeads as Array<any> | undefined) || [];
        leads.push(leadRecord);

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
        afterState: leadRecord,
      });
    } catch {
      /* ignore audit write failure */
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
