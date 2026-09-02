'use client';

import { calcHpEmi } from '@/lib/verticals/math';

type Props = {
  priceLkr: number;
  className?: string;
};

function fmt(n: number) {
  return `Rs. ${Math.round(n).toLocaleString('en-LK')}`;
}

/** Sri Lankan BNPL / installment estimates (PayHere, Koko, Grabber HP). */
export function BnplCalculator({ priceLkr, className = '' }: Props) {
  const card12 = Math.ceil(priceLkr / 12);
  const koko3 = Math.ceil(priceLkr / 3);
  const hpDown = Math.round(priceLkr * 0.2);
  const hpEmi = calcHpEmi(priceLkr, hpDown, 12);

  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pay your way</p>
      <ul className="space-y-2 text-sm">
        <li className="flex justify-between gap-2">
          <span className="text-slate-600">PayHere card installments</span>
          <span className="font-semibold text-slate-900">{fmt(card12)}/mo × 12</span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-slate-600">Koko / Mintpay</span>
          <span className="font-semibold text-slate-900">{fmt(koko3)} in 3 interest-free</span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-slate-600">Grabber Hire Purchase</span>
          <span className="font-semibold text-emerald-800">{fmt(hpEmi)}/mo · 20% down</span>
        </li>
      </ul>
      <p className="text-[11px] text-slate-500">
        Estimates only. Final approval at checkout or in-store with Polim Potha guarantor.
      </p>
    </div>
  );
}
