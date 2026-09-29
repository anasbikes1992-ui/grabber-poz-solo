import { NextResponse } from 'next/server';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, auditLogs, businessConfig, companyLeads } from '@/db';
import { assertRole, requireActiveStaffSession } from '@/lib/auth/session';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';
import {
  runCompanyLeadStatusAutomation,
  runCompanyLeadSubmittedAutomation,
} from '@/lib/company/whatsapp-automation';

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'MARKETING'] as const;
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST', 'ARCHIVED'] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

const updateSchema = z.object({
  id: z.string().uuid(),
  businessName: z.string().trim().min(2).max(120).optional(),
  ownerName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().regex(/^[+0-9][0-9\s().-]{6,24}$/).optional(),
  email: z.string().trim().email().max(254).optional(),
  businessType: z.string().trim().max(80).optional(),
  branchCount: z.string().trim().max(40).optional(),
  message: z.string().trim().max(1000).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().trim().max(2000).optional(),
  nextAction: z.string().trim().max(240).nullable().optional(),
  lastContactedAt: z.string().datetime().nullable().optional(),
});

const createSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[+0-9][0-9\s().-]{6,24}$/),
  email: z.string().trim().email().max(254),
  businessType: z.string().trim().max(80).optional(),
  branchCount: z.string().trim().max(40).optional(),
  message: z.string().trim().max(1000).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().trim().max(2000).optional(),
  nextAction: z.string().trim().max(240).optional(),
});

async function requireCompanyLeadAdmin() {
  const session = await requireActiveStaffSession();
  return assertRole(session, [...ALLOWED_ROLES]);
}

function serializeLead(row: typeof companyLeads.$inferSelect) {
  return {
    id: row.id,
    businessName: row.businessName,
    ownerName: row.ownerName,
    phone: row.phone,
    email: row.email,
    businessType: row.businessType,
    branchCount: row.branchCount,
    message: row.message,
    status: row.status,
    source: row.source,
    notes: row.notes,
    nextAction: row.nextAction,
    assignedTo: row.assignedTo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastContactedAt: row.lastContactedAt?.toISOString() || null,
  };
}

function normalizeLeadStatus(value: unknown): LeadStatus {
  return LEAD_STATUSES.includes(value as LeadStatus) ? (value as LeadStatus) : 'NEW';
}

function normalizeLegacyLead(value: unknown) {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const now = new Date().toISOString();
  const createdAt = typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : now;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : `legacy_${createdAt}_${String(raw.email || raw.phone || 'lead')}`;

  return {
    id,
    businessName: typeof raw.businessName === 'string' ? raw.businessName : '',
    ownerName: typeof raw.ownerName === 'string' ? raw.ownerName : '',
    phone: typeof raw.phone === 'string' ? raw.phone : '',
    email: typeof raw.email === 'string' ? raw.email : '',
    businessType: typeof raw.businessType === 'string' && raw.businessType ? raw.businessType : 'General Retail',
    branchCount: typeof raw.branchCount === 'string' && raw.branchCount ? raw.branchCount : '1',
    message: typeof raw.message === 'string' ? raw.message : '',
    status: normalizeLeadStatus(raw.status),
    source: typeof raw.source === 'string' && raw.source ? raw.source : 'company_landing',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    nextAction: typeof raw.nextAction === 'string' ? raw.nextAction : null,
    assignedTo: typeof raw.assignedTo === 'string' ? raw.assignedTo : null,
    createdAt,
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : createdAt,
    lastContactedAt: typeof raw.lastContactedAt === 'string' ? raw.lastContactedAt : null,
  };
}

async function legacyLeads() {
  const [row] = await db.select().from(businessConfig).limit(1);
  const cfg = (row?.configJson || {}) as Record<string, unknown>;
  return Array.isArray(cfg.commercialLeads) ? cfg.commercialLeads.map(normalizeLegacyLead) : [];
}

export async function GET(req: Request) {
  try {
    await requireCompanyLeadAdmin();
    const { searchParams } = new URL(req.url);
    const rawStatus = searchParams.get('status')?.trim().toUpperCase();
    const status = rawStatus && rawStatus !== 'ALL' && LEAD_STATUSES.includes(rawStatus as LeadStatus)
      ? rawStatus as LeadStatus
      : undefined;
    const q = searchParams.get('q')?.trim().toLowerCase();

    try {
      const filters = [
        status ? eq(companyLeads.status, status) : undefined,
        q
          ? or(
              ilike(companyLeads.businessName, `%${q}%`),
              ilike(companyLeads.ownerName, `%${q}%`),
              ilike(companyLeads.email, `%${q}%`),
              ilike(companyLeads.phone, `%${q}%`),
            )
          : undefined,
      ].filter(Boolean);

      const rows = filters.length
        ? await db
            .select()
            .from(companyLeads)
            .where(and(...filters))
            .orderBy(desc(companyLeads.createdAt))
            .limit(500)
        : await db.select().from(companyLeads).orderBy(desc(companyLeads.createdAt)).limit(500);

      const stats = LEAD_STATUSES.reduce<Record<string, number>>((acc, s) => {
        acc[s] = 0;
        return acc;
      }, {});
      for (const row of rows) stats[row.status] = (stats[row.status] || 0) + 1;

      return NextResponse.json({ success: true, leads: rows.map(serializeLead), stats });
    } catch (err) {
      console.error('Company leads table read failed; using legacy config JSON', err);
      let leads = await legacyLeads();
      if (status) leads = leads.filter((lead) => lead.status === status);
      if (q) {
        leads = leads.filter((lead) =>
          [lead.businessName, lead.ownerName, lead.email, lead.phone]
            .some((value) => value.toLowerCase().includes(q)),
        );
      }
      const stats = LEAD_STATUSES.reduce<Record<string, number>>((acc, s) => {
        acc[s] = 0;
        return acc;
      }, {});
      for (const lead of leads) stats[lead.status] = (stats[lead.status] || 0) + 1;
      return NextResponse.json({ success: true, leads, stats, legacy: true });
    }
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Unauthorized' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not load leads', logMessage: 'Company leads admin load failed' });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireCompanyLeadAdmin();
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid lead update');
    }
    const body = parsed.data;
    const [previousLead] = await db.select().from(companyLeads).where(eq(companyLeads.id, body.id)).limit(1);
    const update = {
      businessName: body.businessName,
      ownerName: body.ownerName,
      phone: body.phone,
      email: body.email?.toLowerCase(),
      businessType: body.businessType,
      branchCount: body.branchCount,
      message: body.message,
      status: body.status,
      notes: body.notes,
      nextAction: body.nextAction,
      lastContactedAt: body.lastContactedAt ? new Date(body.lastContactedAt) : body.lastContactedAt === null ? null : undefined,
      updatedAt: new Date(),
    };

    const [lead] = await db
      .update(companyLeads)
      .set(update)
      .where(eq(companyLeads.id, body.id))
      .returning();

    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });

    await db.insert(auditLogs).values({
      actorId: session.userId,
      action: 'COMPANY_LEAD_UPDATED',
      entity: 'company_lead',
      entityId: lead.id,
      afterState: serializeLead(lead),
    });

    try {
      await runCompanyLeadStatusAutomation(serializeLead(lead), previousLead?.status);
    } catch (err) {
      console.error('Company WhatsApp lead status automation failed', err);
    }

    return NextResponse.json({ success: true, lead: serializeLead(lead) });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not update lead', logMessage: 'Company lead update failed' });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireCompanyLeadAdmin();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message || 'Invalid lead');
    }
    const body = parsed.data;

    const [lead] = await db
      .insert(companyLeads)
      .values({
        businessName: body.businessName,
        ownerName: body.ownerName,
        phone: body.phone,
        email: body.email.toLowerCase(),
        businessType: body.businessType || 'General Retail',
        branchCount: body.branchCount || '1',
        message: body.message || '',
        status: body.status || 'NEW',
        source: 'admin',
        notes: body.notes || '',
        nextAction: body.nextAction || null,
      })
      .returning();

    await db.insert(auditLogs).values({
      actorId: session.userId,
      action: 'COMPANY_LEAD_CREATED',
      entity: 'company_lead',
      entityId: lead.id,
      afterState: serializeLead(lead),
    });

    try {
      await runCompanyLeadSubmittedAutomation(serializeLead(lead));
      if (lead.status && lead.status !== 'NEW') {
        await runCompanyLeadStatusAutomation(serializeLead(lead), 'NEW');
      }
    } catch (err) {
      console.error('Company WhatsApp manual lead automation failed', err);
    }

    return NextResponse.json({ success: true, lead: serializeLead(lead) });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not create lead', logMessage: 'Company lead create failed' });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireCompanyLeadAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return validationErrorResponse('id required');

    const [lead] = await db
      .update(companyLeads)
      .set({ status: 'ARCHIVED', updatedAt: new Date() })
      .where(eq(companyLeads.id, id))
      .returning();

    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });

    await db.insert(auditLogs).values({
      actorId: session.userId,
      action: 'COMPANY_LEAD_ARCHIVED',
      entity: 'company_lead',
      entityId: lead.id,
      afterState: serializeLead(lead),
    });

    return NextResponse.json({ success: true, lead: serializeLead(lead) });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Could not archive lead', logMessage: 'Company lead archive failed' });
  }
}
