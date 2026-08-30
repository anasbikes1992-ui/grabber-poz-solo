'use client';

import React, { useState } from 'react';
import { Wrench, Plus, Search, CheckCircle2, Clock, Phone, MessageSquare, AlertCircle, X, ShieldAlert, ArrowRight } from 'lucide-react';

interface RepairTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  phone: string;
  device: string;
  serialNumber: string;
  issue: string;
  technician: string;
  estimatedCost: number;
  status: 'INTAKE' | 'DIAGNOSING' | 'WAITING_PARTS' | 'REPAIRED' | 'COLLECTED';
  warrantyDays: number;
  receivedAt: string;
}

export default function RepairsPage() {
  const [tickets, setTickets] = useState<RepairTicket[]>([
    {
      id: 'rep_1',
      ticketNumber: 'REP-2026-101',
      customerName: 'Roshan Fernando',
      phone: '+94 77 444 5566',
      device: 'Apple iPhone 14 Pro',
      serialNumber: 'SN-99887711',
      issue: 'Cracked OLED screen replacement & battery service',
      technician: 'Kamal (Senior Tech)',
      estimatedCost: 38500.0,
      status: 'WAITING_PARTS',
      warrantyDays: 90,
      receivedAt: 'Today, 10:15 AM',
    },
    {
      id: 'rep_2',
      ticketNumber: 'REP-2026-102',
      customerName: 'Dilshan Silva',
      phone: '+94 71 222 3344',
      device: 'Samsung 55" 4K Smart TV',
      serialNumber: 'SN-TV-554433',
      issue: 'Power supply board capacitor failure',
      technician: 'Nimal (Electronics Tech)',
      estimatedCost: 14500.0,
      status: 'REPAIRED',
      warrantyDays: 180,
      receivedAt: 'Yesterday',
    },
  ]);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New ticket form
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [device, setDevice] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [issue, setIssue] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(15000);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const newT: RepairTicket = {
      id: `rep_${Date.now()}`,
      ticketNumber: `REP-2026-${Math.floor(100 + Math.random() * 900)}`,
      customerName,
      phone,
      device,
      serialNumber,
      issue,
      technician: 'Kamal (Senior Tech)',
      estimatedCost: Number(estimatedCost),
      status: 'INTAKE',
      warrantyDays: 90,
      receivedAt: 'Just now',
    };
    setTickets((prev) => [newT, ...prev]);
    setIsModalOpen(false);
  };

  const advanceStatus = (id: string) => {
    const statusFlow: RepairTicket['status'][] = ['INTAKE', 'DIAGNOSING', 'WAITING_PARTS', 'REPAIRED', 'COLLECTED'];
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const currentIdx = statusFlow.indexOf(t.status);
          const nextStatus = statusFlow[Math.min(statusFlow.length - 1, currentIdx + 1)];
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Repairs & Service Workshop Desk</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">
              Electronics & Service Vertical
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Job cards, device serial tracking, parts cost, warranty management, and WhatsApp repair notifications.
          </p>
        </div>

        <button
          onClick={() => {
            setCustomerName('');
            setPhone('+94 ');
            setDevice('');
            setSerialNumber('');
            setIssue('');
            setIsModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Repair Job Card</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-muted-foreground font-medium">In Workshop</p>
          <h3 className="text-xl font-bold text-foreground mt-1">2 Devices</h3>
          <p className="text-[10px] text-blue-600 font-medium">1 Waiting Parts &bull; 1 Ready</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-muted-foreground font-medium">Ready for Collection</p>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">1 Device</h3>
          <p className="text-[10px] text-muted-foreground">Samsung 55" TV (LKR 14,500)</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-muted-foreground font-medium">Avg Turnaround Time</p>
          <h3 className="text-xl font-bold text-foreground mt-1">24.5 Hours</h3>
          <p className="text-[10px] text-emerald-600 font-medium">96% on-time completion</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-muted-foreground font-medium">Service Revenue (MTD)</p>
          <h3 className="text-xl font-bold text-primary mt-1">LKR 142,800.00</h3>
          <p className="text-[10px] text-muted-foreground">Labor + Parts Margin</p>
        </div>
      </div>

      {/* Repair Tickets Table */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, device or ticket..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Job Card #</th>
                <th className="pb-2.5 font-medium">Customer & Phone</th>
                <th className="pb-2.5 font-medium">Device & Serial</th>
                <th className="pb-2.5 font-medium">Reported Fault</th>
                <th className="pb-2.5 font-medium text-right">Estimated Fee</th>
                <th className="pb-2.5 font-medium text-right">Status</th>
                <th className="pb-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tickets
                .filter((t) => t.customerName.toLowerCase().includes(search.toLowerCase()) || t.device.toLowerCase().includes(search.toLowerCase()) || t.ticketNumber.toLowerCase().includes(search.toLowerCase()))
                .map((t) => (
                  <tr key={t.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3 font-mono font-bold text-foreground">{t.ticketNumber}</td>
                    <td className="py-3">
                      <p className="font-semibold text-foreground">{t.customerName}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {t.phone}
                      </p>
                    </td>
                    <td className="py-3">
                      <p className="font-medium text-foreground">{t.device}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{t.serialNumber}</p>
                    </td>
                    <td className="py-3 text-muted-foreground max-w-xs">{t.issue}</td>
                    <td className="py-3 text-right font-mono font-bold text-foreground">
                      LKR {t.estimatedCost.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        t.status === 'COLLECTED'
                          ? 'bg-secondary text-muted-foreground'
                          : t.status === 'REPAIRED'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : t.status === 'WAITING_PARTS'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`https://wa.me/${t.phone.replace(/[^0-9]/g, '')}?text=Hi+${encodeURIComponent(t.customerName)}%2C+your+repair+job+${t.ticketNumber}+(${t.device})+is+currently%3A+${t.status}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-colors"
                          title="WhatsApp Update"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </a>
                        {t.status !== 'COLLECTED' && (
                          <button
                            onClick={() => advanceStatus(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-semibold text-[11px] flex items-center gap-1 hover:bg-primary/90 transition-all"
                          >
                            <span>Next</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateTicket} className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Intake New Repair Job</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Kasun Silva"
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Device Model</label>
                  <input
                    type="text"
                    required
                    value={device}
                    onChange={(e) => setDevice(e.target.value)}
                    placeholder="e.g. iPhone 15 Pro"
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Serial / IMEI</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="SN-123456"
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Reported Fault / Symptoms</label>
                <textarea
                  rows={2}
                  required
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="e.g. No display output after drop, touch unresponsive"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Estimated Repair Cost (LKR)</label>
                <input
                  type="number"
                  required
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
            >
              Issue Job Card & Print Intake Slip
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
