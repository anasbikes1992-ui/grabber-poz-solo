'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CreditCard, Plus, Search, CheckCircle2, AlertTriangle, ArrowLeft, Phone, Calendar, User, DollarSign, X } from 'lucide-react';

interface HPContract {
  id: string;
  contractNumber: string;
  customerName: string;
  nicNumber: string;
  phone: string;
  itemName: string;
  totalCashPrice: number;
  downPayment: number;
  monthlyEmi: number;
  totalMonths: number;
  paidMonths: number;
  nextDueDate: string;
  status: 'ACTIVE' | 'SETTLED' | 'OVERDUE';
}

export default function HirePurchasePage() {
  const [contracts, setContracts] = useState<HPContract[]>([
    {
      id: 'hp_1',
      contractNumber: 'HP-2026-8801',
      customerName: 'Sunil Weerasinghe',
      nicNumber: '198523401928',
      phone: '+94 77 333 4455',
      itemName: 'Singer Refrigerator 220L',
      totalCashPrice: 125000.0,
      downPayment: 25000.0,
      monthlyEmi: 9500.0,
      totalMonths: 12,
      paidMonths: 4,
      nextDueDate: '2026-09-05',
      status: 'ACTIVE',
    },
    {
      id: 'hp_2',
      contractNumber: 'HP-2026-8802',
      customerName: 'Kumara Jayasuriya',
      nicNumber: '199211204859',
      phone: '+94 71 888 7766',
      itemName: 'Apple iPhone 14 128GB',
      totalCashPrice: 245000.0,
      downPayment: 50000.0,
      monthlyEmi: 18500.0,
      totalMonths: 12,
      paidMonths: 2,
      nextDueDate: '2026-08-25',
      status: 'OVERDUE',
    },
  ]);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [itemName, setItemName] = useState('');
  const [totalCashPrice, setTotalCashPrice] = useState(100000);
  const [downPayment, setDownPayment] = useState(20000);
  const [totalMonths, setTotalMonths] = useState(12);

  const monthlyEmi = Math.round(((totalCashPrice - downPayment) * 1.15) / totalMonths);

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    const newC: HPContract = {
      id: `hp_${Date.now()}`,
      contractNumber: `HP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName,
      nicNumber,
      phone,
      itemName,
      totalCashPrice: Number(totalCashPrice),
      downPayment: Number(downPayment),
      monthlyEmi,
      totalMonths: Number(totalMonths),
      paidMonths: 0,
      nextDueDate: '2026-09-30',
      status: 'ACTIVE',
    };
    setContracts((prev) => [newC, ...prev]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-white">
      {/* Header */}
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
              <span>💳 Hire Purchase & Micro-Credit Suite</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                INSTALLMENT CONTRACTS
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              NIC verification, down payments, monthly EMI schedules (3/6/12m), and WhatsApp installment reminders.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-400/20 hover:from-emerald-300 hover:to-cyan-300 transition-all self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Installment Contract</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-1">
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Active HP Book</p>
          <p className="text-xl font-extrabold text-white font-mono">LKR 370,000.00</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-1">
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Expected Monthly EMI</p>
          <p className="text-xl font-extrabold text-cyan-400 font-mono">LKR 28,000.00</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-1">
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Overdue Installments</p>
          <p className="text-xl font-extrabold text-red-400 font-mono">LKR 18,500.00</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-1">
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Default Rate</p>
          <p className="text-xl font-extrabold text-emerald-400">1.8% (Healthy)</p>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, NIC or contract #..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="pb-2.5 font-medium">Contract #</th>
                <th className="pb-2.5 font-medium">Customer & NIC</th>
                <th className="pb-2.5 font-medium">Financed Item</th>
                <th className="pb-2.5 font-medium text-right">Monthly EMI</th>
                <th className="pb-2.5 font-medium text-right">Tenure Progress</th>
                <th className="pb-2.5 font-medium text-right">Next Due</th>
                <th className="pb-2.5 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {contracts
                .filter((c) => c.customerName.toLowerCase().includes(search.toLowerCase()) || c.nicNumber.includes(search) || c.contractNumber.includes(search))
                .map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-mono font-bold text-white">{c.contractNumber}</td>
                    <td className="py-3">
                      <p className="font-semibold text-white">{c.customerName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NIC: {c.nicNumber}</p>
                    </td>
                    <td className="py-3 text-slate-300">{c.itemName}</td>
                    <td className="py-3 text-right font-mono font-bold text-cyan-400">
                      LKR {c.monthlyEmi.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-300">
                      {c.paidMonths} / {c.totalMonths} Months
                    </td>
                    <td className="py-3 text-right font-mono text-slate-300">{c.nextDueDate}</td>
                    <td className="py-3 text-right">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateContract} className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-bold text-sm text-white">Create New Hire Purchase Contract</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">NIC / ID Number *</label>
                  <input
                    type="text"
                    required
                    value={nicNumber}
                    onChange={(e) => setNicNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Financed Product / Item *</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Cash Price (Rs)</label>
                  <input
                    type="number"
                    required
                    value={totalCashPrice}
                    onChange={(e) => setTotalCashPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Down Payment</label>
                  <input
                    type="number"
                    required
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-emerald-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Months</label>
                  <select
                    value={totalMonths}
                    onChange={(e) => setTotalMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                  >
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months</option>
                    <option value={24}>24 Months</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex justify-between items-center">
                <span className="text-slate-300 font-medium">Calculated Monthly EMI:</span>
                <span className="text-lg font-extrabold text-cyan-400 font-mono">LKR {monthlyEmi.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-extrabold text-xs shadow-md shadow-emerald-400/20 hover:from-emerald-300 hover:to-cyan-300 transition-all"
            >
              Sign & Activate HP Contract
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
