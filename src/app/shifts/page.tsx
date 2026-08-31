'use client';

import React, { useEffect, useState } from 'react';
import { Calculator, Printer } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface ShiftRecord {
  id: string;
  registerName: string;
  cashierName: string;
  openingFloat: number;
  cashSales: number;
  cardSales: number;
  creditSales: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCash?: number;
  variance?: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
}

const emptyOpen: ShiftRecord = {
  id: '',
  registerName: 'Main Register',
  cashierName: 'Cashier',
  openingFloat: 0,
  cashSales: 0,
  cardSales: 0,
  creditSales: 0,
  cashIn: 0,
  cashOut: 0,
  expectedCash: 0,
  status: 'CLOSED',
  openedAt: '—',
};

export default function ShiftsPage() {
  const [activeShift, setActiveShift] = useState<ShiftRecord>(emptyOpen);
  const [apiNote, setApiNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isCashInOutModalOpen, setIsCashInOutModalOpen] = useState(false);
  const [cashInOutType, setCashInOutType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_OUT');
  const [cashInOutAmount, setCashInOutAmount] = useState(1500);
  const [cashInOutReason, setCashInOutReason] = useState('');

  const [countedCash, setCountedCash] = useState(0);
  const [openingFloatInput, setOpeningFloatInput] = useState(25000);
  const [showZReport, setShowZReport] = useState(false);

  const refreshOpenShift = async () => {
    try {
      const res = await fetch('/api/shifts');
      const data = await res.json();
      const s = data.openShift || data.shifts?.[0];
      if (data.success && s) {
        const float = Number(s.openingFloat || 0);
        setActiveShift({
          id: s.id,
          registerName: 'Register',
          cashierName: 'Cashier',
          openingFloat: float,
          cashSales: 0,
          cardSales: 0,
          creditSales: 0,
          cashIn: 0,
          cashOut: 0,
          expectedCash: float,
          status: 'OPEN',
          openedAt: s.openedAt ? new Date(s.openedAt).toLocaleString() : 'Open',
        });
        setCountedCash(float);
      } else {
        setActiveShift(emptyOpen);
      }
    } catch {
      setApiNote('Could not load shifts — is DATABASE_URL configured?');
    }
  };

  useEffect(() => {
    refreshOpenShift();
  }, []);

  const handleOpenShift = async () => {
    setBusy(true);
    setApiNote(null);
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingFloat: openingFloatInput }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Open failed');
      await refreshOpenShift();
      setApiNote(data.reused ? 'Reused existing open shift' : 'Shift opened');
    } catch (err: unknown) {
      setApiNote((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCashInOut = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveShift((prev) => {
      const isOut = cashInOutType === 'CASH_OUT';
      const newCashIn = isOut ? prev.cashIn : prev.cashIn + Number(cashInOutAmount);
      const newCashOut = isOut ? prev.cashOut + Number(cashInOutAmount) : prev.cashOut;
      const newExpected = prev.openingFloat + prev.cashSales + newCashIn - newCashOut;
      return { ...prev, cashIn: newCashIn, cashOut: newCashOut, expectedCash: newExpected };
    });
    setIsCashInOutModalOpen(false);
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift.id) return;
    setBusy(true);
    setApiNote(null);
    try {
      const res = await fetch('/api/shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          closingCash: Number(countedCash),
          actualCard: activeShift.cardSales,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Close failed');
      const variance = Number(data.totals?.variance ?? Number(countedCash) - activeShift.expectedCash);
      setActiveShift((prev) => ({
        ...prev,
        actualCash: Number(countedCash),
        variance,
        status: 'CLOSED',
        closedAt: new Date().toLocaleString(),
        cashSales: Number(data.totals?.cashSales || prev.cashSales),
        cardSales: Number(data.totals?.cardSales || prev.cardSales),
      }));
      if (data.zReportHint) setApiNote(data.zReportHint);
      setIsCloseModalOpen(false);
      setShowZReport(true);
    } catch (err: unknown) {
      setApiNote((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Shifts &amp; Z-Close</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Durable open/close via /api/shifts · cash in/out still local until ledgered
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          {activeShift.status !== 'OPEN' && (
            <div className="flex gap-2 items-end">
              <div>
                <label htmlFor="opening-float" className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  Opening float (LKR)
                </label>
                <input
                  id="opening-float"
                  type="number"
                  value={openingFloatInput}
                  onChange={(e) => setOpeningFloatInput(Number(e.target.value))}
                  className="w-32 px-3 py-2 text-sm rounded-xl bg-zinc-900/80 border border-zinc-800"
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={handleOpenShift}
                className="min-h-10 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold hover:bg-emerald-400 disabled:opacity-50"
              >
                Open Shift
              </button>
            </div>
          )}
          {activeShift.status === 'OPEN' && (
            <button
              type="button"
              onClick={() => setIsCloseModalOpen(true)}
              className="min-h-10 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold"
            >
              Z-Close Shift
            </button>
          )}
        </div>
      </div>

      {apiNote && (
        <p role="status" className="text-xs text-emerald-400/90 glass-card px-3 py-2 rounded-xl">
          {apiNote}
        </p>
      )}

      <div className="p-5 rounded-2xl glass-card glow-border-emerald space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Active shift</p>
            <p className="text-sm font-bold text-foreground">{activeShift.id || 'No open shift'}</p>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-md ${
              activeShift.status === 'OPEN' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {activeShift.status}
          </span>
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Opening float</dt>
            <dd className="font-mono font-bold">{activeShift.openingFloat.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Expected cash</dt>
            <dd className="font-mono font-bold">{activeShift.expectedCash.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Opened</dt>
            <dd className="font-medium">{activeShift.openedAt}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Register</dt>
            <dd className="font-medium">{activeShift.registerName}</dd>
          </div>
        </dl>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsCashInOutModalOpen(true)}
            className="min-h-9 px-3 rounded-xl border border-zinc-800 text-xs font-semibold hover:bg-zinc-900"
          >
            Cash In / Out
          </button>
          {showZReport && (
            <button
              type="button"
              className="min-h-9 px-3 rounded-xl border border-zinc-800 text-xs font-semibold inline-flex items-center gap-1"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Z-Report ready
            </button>
          )}
        </div>
      </div>

      <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="Z-Close register">
        <form onSubmit={handleCloseShift} className="space-y-4">
          <div>
            <label htmlFor="counted-cash" className="text-xs font-semibold block mb-1">
              Counted cash (LKR)
            </label>
            <input
              id="counted-cash"
              type="number"
              required
              value={countedCash}
              onChange={(e) => setCountedCash(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono"
            />
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
            Expected ≈ {activeShift.expectedCash.toFixed(2)} (sales totals refresh from DB on close)
          </p>
          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50"
          >
            Confirm Z-Close
          </button>
        </form>
      </Modal>

      <Modal isOpen={isCashInOutModalOpen} onClose={() => setIsCashInOutModalOpen(false)} title="Cash movement">
        <form onSubmit={handleCashInOut} className="space-y-3">
          <div role="radiogroup" aria-label="Cash movement type" className="flex gap-2">
            {(['CASH_IN', 'CASH_OUT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={cashInOutType === t}
                onClick={() => setCashInOutType(t)}
                className={`flex-1 min-h-10 rounded-xl text-xs font-bold border ${
                  cashInOutType === t ? 'border-emerald-400 bg-emerald-500/10 text-emerald-400' : 'border-zinc-800'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="cio-amount" className="text-xs font-semibold block mb-1">
              Amount
            </label>
            <input
              id="cio-amount"
              type="number"
              value={cashInOutAmount}
              onChange={(e) => setCashInOutAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm"
            />
          </div>
          <div>
            <label htmlFor="cio-reason" className="text-xs font-semibold block mb-1">
              Reason
            </label>
            <input
              id="cio-reason"
              value={cashInOutReason}
              onChange={(e) => setCashInOutReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm"
            />
          </div>
          <button type="submit" className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold">
            Apply locally
          </button>
        </form>
      </Modal>
    </div>
  );
}
