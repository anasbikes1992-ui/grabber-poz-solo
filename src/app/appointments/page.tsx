'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, Plus, Search, CheckCircle2, Clock, User, Phone, ArrowLeft, X, MessageSquare } from 'lucide-react';

interface AppointmentSlot {
  id: string;
  customerName: string;
  phone: string;
  service: string;
  specialist: string;
  date: string;
  timeSlot: string;
  fee: number;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentSlot[]>([
    {
      id: 'apt_1',
      customerName: 'Kavindi Perera',
      phone: '+94 77 999 1122',
      service: 'VIP Bridal Consultation & Fitting',
      specialist: 'Nilmini (Senior Stylist)',
      date: 'Today',
      timeSlot: '02:30 PM - 03:30 PM',
      fee: 8500.0,
      status: 'CONFIRMED',
    },
    {
      id: 'apt_2',
      customerName: 'Dr. Rohan De Silva',
      phone: '+94 71 555 6677',
      service: 'Custom Suit Bespoke Tailoring Measurement',
      specialist: 'Master Tailor - Ranjith',
      date: 'Today',
      timeSlot: '04:00 PM - 05:00 PM',
      fee: 15000.0,
      status: 'IN_PROGRESS',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('+94 ');
  const [service, setService] = useState('Personal Styling Session');
  const [specialist, setSpecialist] = useState('Nilmini (Senior Stylist)');
  const [timeSlot, setTimeSlot] = useState('11:00 AM - 12:00 PM');
  const [fee, setFee] = useState(5000);

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const newA: AppointmentSlot = {
      id: `apt_${Date.now()}`,
      customerName,
      phone,
      service,
      specialist,
      date: 'Today',
      timeSlot,
      fee: Number(fee),
      status: 'CONFIRMED',
    };
    setAppointments((prev) => [newA, ...prev]);
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
              <span>📅 Client Appointments & Booking Hub</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 font-bold border border-teal-500/30">
                TIME MATRIX & SLOTS
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Service calendar, specialist allocation, slot booking, and automated WhatsApp reminder notifications.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-teal-400/20 hover:from-teal-300 hover:to-cyan-300 transition-all self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Book Client Appointment</span>
        </button>
      </div>

      {/* Appointments Grid Table */}
      <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-4 text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="pb-2.5 font-medium">Scheduled Time</th>
                <th className="pb-2.5 font-medium">Customer & Contact</th>
                <th className="pb-2.5 font-medium">Booked Service</th>
                <th className="pb-2.5 font-medium">Assigned Specialist</th>
                <th className="pb-2.5 font-medium text-right">Service Fee</th>
                <th className="pb-2.5 font-medium text-right">Status</th>
                <th className="pb-2.5 font-medium text-right">Reminder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 font-mono font-bold text-cyan-400">{apt.timeSlot}</td>
                  <td className="py-3">
                    <p className="font-semibold text-white">{apt.customerName}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {apt.phone}
                    </p>
                  </td>
                  <td className="py-3 text-slate-300 font-medium">{apt.service}</td>
                  <td className="py-3 text-slate-300">{apt.specialist}</td>
                  <td className="py-3 text-right font-mono font-bold text-white">
                    LKR {apt.fee.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      apt.status === 'CONFIRMED'
                        ? 'bg-teal-500/10 text-teal-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <a
                      href={`https://wa.me/${apt.phone.replace(/[^0-9]/g, '')}?text=Hi+${encodeURIComponent(apt.customerName)}%2C+reminding+you+of+your+upcoming+appointment+for+${encodeURIComponent(apt.service)}+today+at+${encodeURIComponent(apt.timeSlot)}.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-[11px] inline-flex items-center gap-1 transition-all"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>WhatsApp</span>
                    </a>
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
          <form onSubmit={handleCreateAppointment} className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-bold text-sm text-white">Book New Appointment Slot</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
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
                <label className="text-slate-400 block mb-1">Phone Number (WhatsApp) *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Service Requested</label>
                <input
                  type="text"
                  required
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Specialist</label>
                  <select
                    value={specialist}
                    onChange={(e) => setSpecialist(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                  >
                    <option value="Nilmini (Senior Stylist)">Nilmini (Senior Stylist)</option>
                    <option value="Master Tailor - Ranjith">Master Tailor - Ranjith</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Time Slot</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                  >
                    <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
                    <option value="02:30 PM - 03:30 PM">02:30 PM - 03:30 PM</option>
                    <option value="04:00 PM - 05:00 PM">04:00 PM - 05:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Consultation / Service Fee (Rs)</label>
                <input
                  type="number"
                  required
                  value={fee}
                  onChange={(e) => setFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-cyan-400 font-mono font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-400 text-black font-extrabold text-xs shadow-md shadow-teal-400/20 hover:from-teal-300 hover:to-cyan-300 transition-all"
            >
              Confirm Appointment & Send WhatsApp Confirmation
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
