'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Phone,
  FileText,
  Printer,
  ShieldCheck,
  Smartphone,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function RepairsPage() {
  const [jobNum, setJobNum] = useState('10078');
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [deviceModel, setDeviceModel] = useState('');

  // Diagnosis & Charges
  const [requiredParts, setRequiredParts] = useState('');
  const [partsAmount, setPartsAmount] = useState<number>(0);
  const [serviceCharge, setServiceCharge] = useState<number>(2500);
  const [advancePaid, setAdvancePaid] = useState<number>(1000);
  const [technician, setTechnician] = useState('Senior Tech - Nuwan');
  const [commissionPct, setCommissionPct] = useState(15);
  const [primaryFault, setPrimaryFault] = useState('');
  const [inspectionRemarks, setInspectionRemarks] = useState('');

  // Physical Verification Checklist
  const [checklist, setChecklist] = useState({
    simCard: false,
    simTray: true,
    memoryCard: false,
    battery: true,
    backPanel: true,
    backCover: true,
  });

  const [lockType, setLockType] = useState('Numeric PIN Code');
  const [passcode, setPasscode] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const totalBalanceDue = partsAmount + serviceCharge - advancePaid;

  const handleToggleCheck = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveJobSheet = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-white">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <span>🔧 Electronics & Phone Repair Job Sheet</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                SERVICE MODULE
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Intake job card, device inspection checklist, parts tracker, technician commissions & claim slips.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 hover:bg-cyan-400 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Repaired Bill</span>
          </button>
          <button className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold text-xs hover:bg-white/10 transition-all">
            View Repaired Bills (0)
          </button>
        </div>
      </div>

      {/* 2. Top Metric Indicator Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-1">
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Custom Bill / Job #</p>
          <p className="text-xl font-extrabold text-white font-mono">{jobNum}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-1">
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Est. Service Charge</p>
          <p className="text-xl font-extrabold text-cyan-400 font-mono">LKR {serviceCharge.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-1">
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Advance Collected</p>
          <p className="text-xl font-extrabold text-emerald-400 font-mono">LKR {advancePaid.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-1">
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Full Total Balance Due</p>
          <p className="text-xl font-extrabold text-amber-400 font-mono">LKR {totalBalanceDue.toLocaleString()}</p>
        </div>
      </div>

      {/* 3. Comprehensive Form Intake */}
      <form onSubmit={handleSaveJobSheet} className="space-y-5 text-xs">
        {/* Section 1: Customer & Device Details */}
        <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-4">
          <h2 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
            <span>👤 1. CUSTOMER & DEVICE DETAILS</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Customer Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Mobile Number *</label>
              <input
                type="text"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="0771234567"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter customer address"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Device Model *</label>
              <input
                type="text"
                required
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                placeholder="e.g. iPhone 13 Pro Max / Galaxy S22"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Fault Diagnosis, Parts & Charges */}
        <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-4">
          <h2 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
            <span>⚙️ 2. FAULT DIAGNOSIS, PARTS & CHARGES</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Required Parts</label>
              <input
                type="text"
                value={requiredParts}
                onChange={(e) => setRequiredParts(e.target.value)}
                placeholder="e.g. OLED Display Assembly, Battery Pack"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Parts Amount (Rs)</label>
              <input
                type="number"
                value={partsAmount}
                onChange={(e) => setPartsAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Service Charge (Rs) *</label>
              <input
                type="number"
                required
                value={serviceCharge}
                onChange={(e) => setServiceCharge(Number(e.target.value))}
                placeholder="e.g. 2500"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Advance Paid (Rs)</label>
              <input
                type="number"
                value={advancePaid}
                onChange={(e) => setAdvancePaid(Number(e.target.value))}
                placeholder="e.g. 1000"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-emerald-400 font-mono font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Select Technician</label>
              <select
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none"
              >
                <option value="Senior Tech - Nuwan">Senior Tech - Nuwan</option>
                <option value="Hardware Specialist - Amal">Hardware Specialist - Amal</option>
                <option value="Software Specialist - Kasun">Software Specialist - Kasun</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Technician Commission (%)</label>
              <select
                value={commissionPct}
                onChange={(e) => setCommissionPct(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none"
              >
                <option value={10}>10% of Service Charge</option>
                <option value={15}>15% of Service Charge</option>
                <option value={20}>20% of Service Charge</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Primary Fault / Issue *</label>
              <textarea
                rows={3}
                required
                value={primaryFault}
                onChange={(e) => setPrimaryFault(e.target.value)}
                placeholder="Enter main issue (e.g. Blank display after drop, touches ghosting)"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Other Issues / Inspection Remarks</label>
              <textarea
                rows={3}
                value={inspectionRemarks}
                onChange={(e) => setInspectionRemarks(e.target.value)}
                placeholder="Scratches on body, rear camera glass cracked, water damage indicators red"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Received Item Checklist (Physical Verification) */}
        <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-4">
          <h2 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
            <span>📋 3. RECEIVED ITEM CHECKLIST (PHYSICAL VERIFICATION)</span>
          </h2>

          {/* Interactive Checkbox Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {(
              [
                { key: 'simCard', label: 'SIM Card' },
                { key: 'simTray', label: 'SIM Tray' },
                { key: 'memoryCard', label: 'Memory Card' },
                { key: 'battery', label: 'Battery' },
                { key: 'backPanel', label: 'Back Panel' },
                { key: 'backCover', label: 'Back Cover' },
              ] as const
            ).map(({ key, label }) => {
              const active = checklist[key];
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleToggleCheck(key)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                      : 'bg-black/30 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  <span>{active ? '✓' : '□'}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Device Lock / Security Type</label>
              <select
                value={lockType}
                onChange={(e) => setLockType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none"
              >
                <option value="Numeric PIN Code">Numeric PIN Code</option>
                <option value="Pattern Sequence">Pattern Sequence</option>
                <option value="Password">Alphanumeric Password</option>
                <option value="No Lock">No Lock (Device Open)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Passcode / Pattern Sequence</label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="e.g. 123456 or Top-Left to Bottom-Right"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-600 font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-slate-400">
            Automatic customer SMS / WhatsApp alert will be ready on save.
          </p>

          {isSaved ? (
            <div className="px-6 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Repair Job Card #10078 Saved & WhatsApp Dispatched!</span>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-95"
            >
              Save & Generate Repair Job Sheet
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
