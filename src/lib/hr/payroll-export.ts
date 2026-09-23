/**
 * EPF Form C / ETF R1 style CSV exports for Board upload.
 * Column layout is Grabber-oriented — map to official templates as needed.
 */
import { eq } from 'drizzle-orm';
import { db, employees, payrollLines, payrollRuns } from '@/db';

function csvEscape(v: unknown): string {
  const s = String(v ?? '');
  const safeS = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  if (/[",\n]/.test(safeS)) return `"${safeS.replace(/"/g, '""')}"`;
  return safeS;
}

export async function exportEpfFormCCsv(runId: string) {
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
  if (!run) throw new Error('Payroll run not found');
  const lines = await db.select().from(payrollLines).where(eq(payrollLines.runId, runId));

  const header = [
    'period',
    'employee_name',
    'nic',
    'epf_number',
    'gross',
    'employee_epf_8pct',
    'employer_epf_12pct',
    'total_epf_20pct',
  ];
  const rows = [header.join(',')];

  for (const line of lines) {
    const [emp] = await db.select().from(employees).where(eq(employees.id, line.employeeId)).limit(1);
    const empEpf = Number(line.employeeEpf);
    const emprEpf = Number(line.employerEpf);
    rows.push(
      [
        csvEscape(run.periodLabel),
        csvEscape(emp?.name || ''),
        csvEscape(emp?.nicNumber || ''),
        csvEscape(emp?.epfNumber || ''),
        Number(line.grossAmount).toFixed(2),
        empEpf.toFixed(2),
        emprEpf.toFixed(2),
        (empEpf + emprEpf).toFixed(2),
      ].join(','),
    );
  }

  rows.push('');
  rows.push(
    `# totals,gross=${run.totalGross},employee_epf=${run.totalEmployeeEpf},employer_epf=${run.totalEmployerEpf}`,
  );

  return { csv: rows.join('\n'), filename: `epf-form-c-${run.periodLabel.replace(/\s+/g, '-')}.csv` };
}

export async function exportEtfR1Csv(runId: string) {
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
  if (!run) throw new Error('Payroll run not found');
  const lines = await db.select().from(payrollLines).where(eq(payrollLines.runId, runId));

  const header = ['period', 'employee_name', 'nic', 'etf_number', 'gross', 'etf_3pct'];
  const rows = [header.join(',')];

  for (const line of lines) {
    const [emp] = await db.select().from(employees).where(eq(employees.id, line.employeeId)).limit(1);
    rows.push(
      [
        csvEscape(run.periodLabel),
        csvEscape(emp?.name || ''),
        csvEscape(emp?.nicNumber || ''),
        csvEscape(emp?.etfNumber || ''),
        Number(line.grossAmount).toFixed(2),
        Number(line.etfAmount).toFixed(2),
      ].join(','),
    );
  }

  rows.push('');
  rows.push(`# totals,gross=${run.totalGross},etf=${run.totalEtf}`);

  return { csv: rows.join('\n'), filename: `etf-r1-${run.periodLabel.replace(/\s+/g, '-')}.csv` };
}
