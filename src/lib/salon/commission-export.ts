/**
 * VERT-S05 — Stylist commission CSV (not full payroll).
 */
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { db, appointments } from '@/db';

function csvEscape(v: unknown): string {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportCommissionCsv(opts: { from?: Date; to?: Date } = {}) {
  const from = opts.from || new Date(Date.now() - 30 * 86400000);
  const to = opts.to || new Date();

  const rows = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, 'COMPLETED'),
        gte(appointments.startsAt, from),
        lte(appointments.startsAt, to),
      ),
    )
    .orderBy(asc(appointments.startsAt));

  const header = [
    'date',
    'specialist',
    'service',
    'customer',
    'phone',
    'fee',
    'commission_pct',
    'commission_amount',
    'source',
    'appointment_id',
  ];

  const lines = [header.join(',')];
  let totalFee = 0;
  let totalComm = 0;
  const bySpecialist: Record<string, { fee: number; commission: number; jobs: number }> = {};

  for (const r of rows) {
    const fee = Number(r.fee || 0);
    const comm = Number(r.commissionAmount || 0);
    totalFee += fee;
    totalComm += comm;
    const key = r.specialist || 'Unassigned';
    const agg = bySpecialist[key] || { fee: 0, commission: 0, jobs: 0 };
    agg.fee += fee;
    agg.commission += comm;
    agg.jobs += 1;
    bySpecialist[key] = agg;

    lines.push(
      [
        r.startsAt ? new Date(r.startsAt).toISOString().slice(0, 10) : '',
        csvEscape(r.specialist || ''),
        csvEscape(r.service),
        csvEscape(r.customerName),
        csvEscape(r.phone),
        fee.toFixed(2),
        Number(r.commissionPct || 0).toFixed(2),
        comm.toFixed(2),
        csvEscape(r.source || 'STAFF'),
        r.id,
      ].join(','),
    );
  }

  lines.push('');
  lines.push(`# totals,jobs=${rows.length},fee=${totalFee.toFixed(2)},commission=${totalComm.toFixed(2)}`);
  for (const [name, a] of Object.entries(bySpecialist)) {
    lines.push(
      `# specialist,${csvEscape(name)},jobs=${a.jobs},fee=${a.fee.toFixed(2)},commission=${a.commission.toFixed(2)}`,
    );
  }

  return {
    csv: lines.join('\n'),
    summary: { jobs: rows.length, totalFee, totalComm, bySpecialist },
  };
}
