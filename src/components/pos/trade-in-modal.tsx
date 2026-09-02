'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { CONDITION_GRADES, appraiseTradeIn, type ConditionGrade } from '@/lib/trade-in/trade-in-appraisal';

export type TradeInCredit = {
  voucherNumber: string;
  creditAmount: number;
  deviceModel: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  onApplied: (credit: TradeInCredit) => void;
};

export function TradeInModal({ isOpen, onClose, branchId, onApplied }: Props) {
  const [deviceModel, setDeviceModel] = useState('iPhone 12');
  const [imei, setImei] = useState('');
  const [baseValue, setBaseValue] = useState(170000);
  const [grade, setGrade] = useState<ConditionGrade>('B');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = appraiseTradeIn(baseValue, grade);

  async function issueVoucher() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/trade-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceModel,
          imei: imei || undefined,
          conditionGrade: grade,
          baseValue,
          customerName,
          customerPhone,
          locationId: branchId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Trade-in failed');
      onApplied({
        voucherNumber: data.voucher.voucherNumber,
        creditAmount: data.appraisalValue,
        deviceModel,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Trade-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Trade-in / buyback" className="max-w-md">
      <div className="space-y-3 text-xs">
        <div>
          <label className="font-semibold block mb-1">Device model</label>
          <input value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border" />
        </div>
        <div>
          <label className="font-semibold block mb-1">IMEI (optional)</label>
          <input value={imei} onChange={(e) => setImei(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-semibold block mb-1">Market value (LKR)</label>
            <input type="number" value={baseValue} onChange={(e) => setBaseValue(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Condition</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value as ConditionGrade)} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border">
              {CONDITION_GRADES.map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-emerald-400 font-bold">Trade-in credit: LKR {preview.toLocaleString()}</p>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="px-3 py-2 rounded-xl bg-secondary border border-border" />
          <input placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="px-3 py-2 rounded-xl bg-secondary border border-border" />
        </div>
        {error && <p className="text-destructive" role="alert">{error}</p>}
        <button type="button" disabled={busy || !deviceModel} onClick={() => void issueVoucher()} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 font-bold disabled:opacity-50">
          {busy ? 'Processing…' : 'Issue voucher & apply to sale'}
        </button>
      </div>
    </Modal>
  );
}
