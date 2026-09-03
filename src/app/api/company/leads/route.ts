import { NextResponse } from 'next/server';
import { db, businessConfig, auditLogs } from '@/db';
import { eq } from 'drizzle-orm';

export interface CompanyLeadInput {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  businessType?: string;
  branchCount?: string;
  message?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CompanyLeadInput;

    if (!body.businessName?.trim() || !body.ownerName?.trim() || !body.phone?.trim() || !body.email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please provide your business name, owner name, phone, and email.' },
        { status: 400 },
      );
    }

    const leadId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const leadRecord = {
      id: leadId,
      businessName: body.businessName.trim(),
      ownerName: body.ownerName.trim(),
      phone: body.phone.trim(),
      email: body.email.trim(),
      businessType: body.businessType || 'General Retail',
      branchCount: body.branchCount || '1',
      message: body.message?.trim() || '',
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
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
