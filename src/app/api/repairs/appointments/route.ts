import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, repairAppointments, repairJobs } from '@/db';
import { dispatchAutomationEvent } from '@/lib/automation/engine';
import { lookupRepairCatalogQuote } from '@/lib/repairs/catalog';
import type { PartQuality } from '@/lib/repairs/catalog';
import type { RepairCategoryId } from '@/lib/repairs/device-tree';
import { formatTicketCode } from '@/lib/repairs/pricing';

type BookingBody = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  visitType: 'STORE_VISIT' | 'COURIER_PICKUP';
  appointmentDate: string;
  timeSlot: string;
  pickupAddress?: string;
  brand: string;
  deviceModel: string;
  repairCategory: RepairCategoryId;
  partQuality: PartQuality;
  issueDescription: string;
  inspectionChecklist?: Record<string, boolean>;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const phone = url.searchParams.get('phone')?.trim();
  if (!phone) {
    return NextResponse.json({ success: false, error: 'phone required' }, { status: 400 });
  }
  const rows = await db
    .select()
    .from(repairAppointments)
    .where(eq(repairAppointments.customerPhone, phone.replace(/\D/g, '')))
    .limit(20);
  return NextResponse.json({ success: true, appointments: rows });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BookingBody;
    if (!body.customerName?.trim() || !body.customerPhone?.trim()) {
      return NextResponse.json({ success: false, error: 'Name and phone required' }, { status: 400 });
    }
    if (!body.appointmentDate || !body.timeSlot) {
      return NextResponse.json({ success: false, error: 'Date and time slot required' }, { status: 400 });
    }
    if (body.visitType === 'COURIER_PICKUP' && !body.pickupAddress?.trim()) {
      return NextResponse.json({ success: false, error: 'Pickup address required for courier repair' }, { status: 400 });
    }

    const quote = lookupRepairCatalogQuote({
      brand: body.brand,
      deviceModel: body.deviceModel,
      repairCategory: body.repairCategory,
      partQuality: body.partQuality,
    });

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(repairJobs);
    const jobNumber = formatTicketCode(Number(count || 0) + 1);

    let courierTrackingNo: string | null = null;
    if (body.visitType === 'COURIER_PICKUP') {
      const apiKey = process.env.KOOMBIYO_API_KEY;
      if (apiKey && body.pickupAddress) {
        courierTrackingNo = `KMB-${Date.now().toString().slice(-8)}`;
      } else {
        courierTrackingNo = `KMB-STUB-${Date.now().toString().slice(-6)}`;
      }
    }

    const result = await db.transaction(async (tx) => {
      const [job] = await tx
        .insert(repairJobs)
        .values({
          jobNumber,
          customerName: body.customerName.trim(),
          customerPhone: body.customerPhone.replace(/\D/g, ''),
          customerAddress: body.pickupAddress?.trim() || null,
          deviceModel: `${body.brand} ${body.deviceModel}`.trim(),
          primaryFault: body.issueDescription.trim(),
          serviceCharge: String(quote.estimatedCostLkr.toFixed(2)),
          status: 'INTAKE',
          checklistJson: {
            source: 'STOREFRONT_BOOK',
            brand: body.brand,
            model: body.deviceModel,
            repairCategory: body.repairCategory,
            partQuality: body.partQuality,
            visitType: body.visitType,
            inspectionChecklist: body.inspectionChecklist || {},
            quote,
          },
        })
        .returning();

      const [appt] = await tx
        .insert(repairAppointments)
        .values({
          ticketId: job.id,
          customerName: body.customerName.trim(),
          customerPhone: body.customerPhone.replace(/\D/g, ''),
          customerEmail: body.customerEmail?.trim() || null,
          visitType: body.visitType,
          appointmentDate: body.appointmentDate,
          timeSlot: body.timeSlot,
          pickupAddress: body.pickupAddress?.trim() || null,
          courierTrackingNo,
          deviceModel: `${body.brand} ${body.deviceModel}`.trim(),
          issueDescription: body.issueDescription.trim(),
          partQuality: body.partQuality,
          estimatedCostLkr: String(quote.estimatedCostLkr.toFixed(2)),
          inspectionChecklist: body.inspectionChecklist || {},
          status: 'SCHEDULED',
        })
        .returning();

      return { job, appt, quote };
    });

    void dispatchAutomationEvent('REPAIR_CREATED', {
      ticketCode: result.job.jobNumber,
      phone: body.customerPhone,
      visitType: body.visitType,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      ticketCode: result.job.jobNumber,
      appointment: result.appt,
      quote: result.quote,
      courierTrackingNo,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
