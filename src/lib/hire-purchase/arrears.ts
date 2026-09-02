type ContractSlice = {
  status: string;
  nextDueDate: Date | string | null;
  monthlyEmi: number | string;
  paidMonths: number;
  totalMonths: number;
};

/** Calendar-day diff in UTC (avoids DST drift). */
export function utcCalendarDayDiff(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((toUtc - fromUtc) / 86_400_000);
}

export function computeHirePurchaseArrears(contract: ContractSlice) {
  if (contract.status === 'SETTLED' || contract.status === 'CANCELLED') {
    return { overdue: false, daysPastDue: 0, arrearsAmount: 0, missedInstallments: 0 };
  }
  if (!contract.nextDueDate) {
    return { overdue: false, daysPastDue: 0, arrearsAmount: 0, missedInstallments: 0 };
  }

  const due = new Date(contract.nextDueDate);
  const now = new Date();
  if (due >= now) {
    return { overdue: false, daysPastDue: 0, arrearsAmount: 0, missedInstallments: 0 };
  }

  const daysPastDue = utcCalendarDayDiff(due, now);
  const missedInstallments = Math.max(1, Math.ceil(daysPastDue / 30));
  const arrearsAmount = missedInstallments * Number(contract.monthlyEmi || 0);

  return { overdue: true, daysPastDue, arrearsAmount, missedInstallments };
}

export function buildInstallmentSchedule(contract: {
  totalMonths: number;
  paidMonths: number;
  monthlyEmi: number | string;
  nextDueDate: Date | string | null;
}) {
  const emi = Number(contract.monthlyEmi || 0);
  const schedule: Array<{ number: number; dueDate: string; amount: number; paid: boolean }> = [];
  const anchor = contract.nextDueDate ? new Date(contract.nextDueDate) : new Date();

  for (let i = 1; i <= contract.totalMonths; i += 1) {
    const due = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + (i - contract.paidMonths - 1), anchor.getUTCDate()));
    schedule.push({
      number: i,
      dueDate: due.toISOString().slice(0, 10),
      amount: emi,
      paid: i <= contract.paidMonths,
    });
  }
  return schedule;
}
