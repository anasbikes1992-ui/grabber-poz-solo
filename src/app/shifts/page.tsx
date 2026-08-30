'use client';

import React, { useState } from 'react';
import { Clock, DollarSign, Calculator, Printer, CheckCircle2, AlertTriangle, ArrowDownRight, ArrowUpRight, X } from 'lucide-react';

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

export default function ShiftsPage() {
  const [activeShift, setActiveShift] = useState<ShiftRecord>({
    id: 'shift_2026_01',
    registerName: 'Main Counter Register 01 (BR-01)',
    cashierName: 'Amal Perera',
    openingFloat: 25000.0,
    cashSales: 31860.0,
    cardSales: 10620.0,
    creditSales: 21240.0,
    cashIn: 0.0,
    cashOut: 1500.0, // Petty cash expense for cleaning supplies
    expectedCash: 55360.0, // 25000 + 31860 + 0 - 1500
    status: 'OPEN',
    openedAt: 'Today, 08:30 AM',
  });

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isCashInOutModalOpen, setIsCashInOutModalOpen] = useState(false);
  const [cashInOutType, setCashInOutType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_OUT');
  const [cashInOutAmount, setCashInOutAmount] = useState(1500);
  const [cashInOutReason, setCashInOutReason] = useState('');

  const [countedCash, setCountedCash] = useState(55360);
  const [showZReport, setShowZReport] = useState(false);

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

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const variance = Number(countedCash) - activeShift.expectedCash;
    setActiveShift((prev) => ({
      ...prev,
      actualCash: Number(countedCash),
      variance,
      status: 'CLOSED',
      closedAt: 'Today, 05:30 PM',
    }));
    setIsCloseModalOpen(false);
    setShowZReport(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>POS Shifts & End-of-Day Z-Report</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
              activeShift.status === 'OPEN'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
            }`}>
              Shift {activeShift.status}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cash register floating, mid-shift petty cash tracking, and end-of-day discrepancy reconciliation.
          </p>
        </div>

        <div className="flex gap-2">
          {activeShift.status === 'OPEN' && (
            <>
              <button
                onClick={() => {
                  setCashInOutType('CASH_OUT');
                  setIsCashInOutModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border transition-all"
              >
                Petty Cash / Float Adjust
              </button>
              <button
                onClick={() => setIsCloseModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
              >
                <Calculator className="h-3.5 w-3.5" />
                <span>Close Shift & Z-Report</span>
              </button>
            </>
          )}

          {activeShift.status === 'CLOSED' && (
            <button
              onClick={() => setShowZReport(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Z-Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-muted-foreground font-medium">Opening Float</p>
          <h3 className="text-xl font-bold text-foreground mt-1">LKR {activeShift.openingFloat.toLocaleString()}</h3>
          <p className="text-[10px] text-muted-foreground mt-1">Opened at {activeShift.openedAt}</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-muted-foreground font-medium">Cash Sales Taken</p>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">LKR {activeShift.cashSales.toLocaleString()}</h3>
          <p className="text-[10px] text-muted-foreground mt-1">Total Card: LKR {activeShift.cardSales.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-muted-foreground font-medium">Petty Cash Outflows</p>
          <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">- LKR {activeShift.cashOut.toLocaleString()}</h3>
          <p className="text-[10px] text-muted-foreground mt-1">1 Authorized Outflow</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-muted-foreground font-medium">Expected In Drawer</p>
          <h3 className="text-xl font-bold text-primary mt-1">LKR {activeShift.expectedCash.toLocaleString()}</h3>
          <p className="text-[10px] text-muted-foreground mt-1">Float + Sales - Outflows</p>
        </div>
      </div>

      {/* Cash Flow Summary Table */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3 text-xs max-w-2xl">
        <h3 className="font-bold text-sm text-foreground">Drawer Settlement Breakdown</h3>
        <div className="space-y-2 divide-y divide-border/50">
          <div className="flex justify-between pt-2">
            <span className="text-muted-foreground">Register Terminal</span>
            <span className="font-semibold text-foreground">{activeShift.registerName}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-muted-foreground">Cashier on Duty</span>
            <span className="font-semibold text-foreground">{activeShift.cashierName}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-muted-foreground">Opening Cash Float</span>
            <span className="font-mono font-medium text-foreground">LKR {activeShift.openingFloat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-muted-foreground">(+) Cash Sales Tender</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+ LKR {activeShift.cashSales.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-muted-foreground">(-) Cash Out / Store Expenses</span>
            <span className="font-mono font-bold text-destructive">- LKR {activeShift.cashOut.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-3 text-sm font-extrabold text-foreground border-t border-border">
            <span>System Expected Total Cash</span>
            <span className="text-primary">LKR {activeShift.expectedCash.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Petty Cash In/Out Modal */}
      {isCashInOutModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCashInOut} className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Petty Cash Movement (Till Outflow)</h3>
              <button type="button" onClick={() => setIsCashInOutModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Movement Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCashInOutType('CASH_OUT')}
                    className={`py-2 rounded-xl border text-xs font-semibold ${
                      cashInOutType === 'CASH_OUT' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border'
                    }`}
                  >
                    Cash Out (Expense)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashInOutType('CASH_IN')}
                    className={`py-2 rounded-xl border text-xs font-semibold ${
                      cashInOutType === 'CASH_IN' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-border'
                    }`}
                  >
                    Cash In (Top-Up)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Amount (LKR)</label>
                <input
                  type="number"
                  required
                  value={cashInOutAmount}
                  onChange={(e) => setCashInOutAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Reason / Expense Memo</label>
                <input
                  type="text"
                  required
                  value={cashInOutReason}
                  onChange={(e) => setCashInOutReason(e.target.value)}
                  placeholder="e.g. Store Cleaning Materials / Drinking Water"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
            >
              Record Till Movement
            </button>
          </form>
        </div>
      )}

      {/* Close Shift Modal */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCloseShift} className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Close Register Shift & Count Cash</h3>
              <button type="button" onClick={() => setIsCloseModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 bg-secondary/50 rounded-xl border border-border text-center">
              <p className="text-[11px] text-muted-foreground">System Expected Cash in Drawer</p>
              <p className="text-2xl font-extrabold text-primary mt-0.5">LKR {activeShift.expectedCash.toFixed(2)}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Physical Counted Cash (LKR)</label>
                <input
                  type="number"
                  required
                  value={countedCash}
                  onChange={(e) => setCountedCash(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground font-mono font-bold text-lg text-center"
                />
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl bg-secondary/60">
                <span className="font-medium text-foreground">Count Variance:</span>
                <span className={`font-bold font-mono ${
                  Number(countedCash) === activeShift.expectedCash
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-destructive'
                }`}>
                  LKR {(Number(countedCash) - activeShift.expectedCash).toFixed(2)}
                  {Number(countedCash) === activeShift.expectedCash ? ' (Exact Match)' : ' (Discrepancy)'}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99]"
            >
              Verify, Close Shift & Generate Z-Report
            </button>
          </form>
        </div>
      )}

      {/* Printable Z-Report Modal */}
      {showZReport && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-xs">
            <div className="text-center pb-3 border-b border-border space-y-1">
              <h3 className="font-extrabold text-sm text-foreground">GRABBER RETAIL STORE</h3>
              <p className="text-[10px] text-muted-foreground">*** DAILY Z-REPORT (END OF DAY) ***</p>
              <p className="font-mono text-[10px] text-foreground">Shift: {activeShift.id} | Terminal: REG-01</p>
              <p className="text-[10px] text-muted-foreground">{activeShift.openedAt} - {activeShift.closedAt || 'Now'}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Opening Float</span>
                <span>LKR {activeShift.openingFloat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>Cash Sales Tender</span>
                <span>LKR {activeShift.cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>Card Terminal Sales</span>
                <span>LKR {activeShift.cardSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>Polim Potha (Credit Sales)</span>
                <span>LKR {activeShift.creditSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>Petty Cash Expenses</span>
                <span>- LKR {activeShift.cashOut.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-1 font-mono text-[11px]">
              <div className="flex justify-between text-muted-foreground">
                <span>Expected Cash:</span>
                <span>LKR {activeShift.expectedCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground">
                <span>Actual Counted:</span>
                <span>LKR {(activeShift.actualCash || countedCash).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                <span>Over / Short Variance:</span>
                <span>LKR {(activeShift.variance || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                onClick={() => setShowZReport(false)}
                className="flex-1 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => setShowZReport(false)}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Thermal Z-Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
