import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, repairJobs } from '@/db';
import { dispatchAutomationEvent } from '@/lib/automation/engine';
import { buildRepairEstimatePreview, formatTicketCode } from '@/lib/repairs/pricing';
import { getRepairServiceBySlug } from '@/lib/repairs/services';
import type { RepairChecklistMeta, RepairIntakePayload } from '@/lib/repairs/types';

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ticket = url.searchParams.get('ticket')?.trim();
  const phone = url.searchParams.get('phone')?.trim();

  if (!ticket || !phone) {
    return NextResponse.json(
      { success: false, error: 'ticket and phone query params required' },
      { status: 400 },
    );
  }

  const phoneNorm = normalizePhone(phone);
  const [job] = await db
    .select()
    .from(repairJobs)
    .where(eq(repairJobs.jobNumber, ticket))
    .limit(1);

  if (!job || normalizePhone(job.customerPhone) !== phoneNorm) {
    return NextResponse.json({ success: false, error: 'Repair ticket not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    job: {
      ticketCode: job.jobNumber,
      status: job.status,
      deviceModel: job.deviceModel,
      primaryFault: job.primaryFault,
      customerName: job.customerName,
      updatedAt: job.updatedAt,
      checklist: job.checklistJson,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RepairIntakePayload;
    const service = getRepairServiceBySlug(body.serviceSlug);
    if (!service) {
      return NextResponse.json({ success: false, error: 'Invalid service' }, { status: 400 });
    }
    if (!body.customerName?.trim() || !body.customerPhone?.trim()) {
      return NextResponse.json({ success: false, error: 'Name and phone required' }, { status: 400 });
    }
    if (!body.issue?.trim()) {
      return NextResponse.json({ success: false, error: 'Issue description required' }, { status: 400 });
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(repairJobs);
    const jobNumber = formatTicketCode(Number(count || 0) + 1);
    const estimate = buildRepairEstimatePreview(body);
    const deviceModel = [body.brand, body.model].filter(Boolean).join(' ').trim() || body.deviceType;

    const checklist: RepairChecklistMeta = {
      serviceSlug: body.serviceSlug,
      deviceType: body.deviceType,
      brand: body.brand,
      model: body.model,
      mode: body.mode,
      preferredSlot: body.preferredSlot,
      contactChannel: body.contactChannel,
      source: 'STOREFRONT',
    };

    const [job] = await db
      .insert(repairJobs)
      .values({
        jobNumber,
        customerName: body.customerName.trim(),
        customerPhone: body.customerPhone.trim(),
        customerAddress: body.mode === 'HOME_VISIT' ? body.branchNote || null : null,
        deviceModel,
        primaryFault: body.issue.trim(),
        inspectionRemarks: body.issueDetail?.trim() || null,
        checklistJson: { ...checklist, estimatePreview: estimate } as Record<string, unknown>,
        serviceCharge: String(estimate.amountLkr || estimate.diagnosticFeeLkr || 0),
        partsAmount: '0',
        advancePaid: '0',
        status: 'INTAKE',
      })
      .returning();

    await dispatchAutomationEvent('REPAIR_CREATED', {
      repairId: job.id,
      ticketCode: job.jobNumber,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      deviceModel: job.deviceModel,
      issue: job.primaryFault,
      serviceName: service.name,
      mode: body.mode,
    });

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        ticketCode: job.jobNumber,
        status: job.status,
        estimate,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

/** Staff-less lookup list for dev — not exposed */
export async function HEAD() {
  return NextResponse.json({ ok: true });
}
