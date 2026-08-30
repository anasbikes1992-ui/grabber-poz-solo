'use client';

import React, { useState } from 'react';
import { Users, Plus, Search, Edit2, BookOpen, CheckCircle2, X, Phone, Mail } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  creditAllowed: boolean;
  creditLimit: number;
  currentBalance: number;
}

export default function CustomersCRUDPage() {
  const [customers, setCustomers] = useState<Customer[]>([
    { id: 'c1', name: 'Sarath Perera', phone: '+94 77 123 4567', email: 'sarath@gmail.com', address: '45 Lake Road, Colombo 05', creditAllowed: true, creditLimit: 50000.0, currentBalance: 11240.0 },
    { id: 'c2', name: 'Chaminda Silva', phone: '+94 71 987 6543', email: 'chaminda@yahoo.com', address: '12 Temple Lane, Kandy', creditAllowed: true, creditLimit: 30000.0, currentBalance: 8500.0 },
    { id: 'c3', name: 'Kamal Gunaratne', phone: '+94 76 555 4433', email: 'kamal@gmail.com', address: '88 High Level Road, Nugegoda', creditAllowed: true, creditLimit: 40000.0, currentBalance: 0.0 },
    { id: 'c4', name: 'Nimal Silva (WhatsApp Buyer)', phone: '+94 70 111 2233', email: 'nimal@gmail.com', address: '23 Beach Road, Mount Lavinia', creditAllowed: false, creditLimit: 0.0, currentBalance: 0.0 },
  ]);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditAllowed, setCreditAllowed] = useState(false);
  const [creditLimit, setCreditLimit] = useState(0);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('+94 ');
    setEmail('');
    setAddress('');
    setCreditAllowed(false);
    setCreditLimit(0);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setAddress(c.address);
    setCreditAllowed(c.creditAllowed);
    setCreditLimit(c.creditLimit);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingCustomer.id
            ? { ...c, name, phone, email, address, creditAllowed, creditLimit: Number(creditLimit) }
            : c
        )
      );
    } else {
      const newC: Customer = {
        id: `c_${Date.now()}`,
        name,
        phone,
        email,
        address,
        creditAllowed,
        creditLimit: Number(creditLimit),
        currentBalance: 0,
      };
      setCustomers((prev) => [...prev, newC]);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setSaveSuccess(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Customer CRM & Credit Accounts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customer directory, contact profiles, and Polim Potha credit limit configurations.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, phone, or email..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-card border border-border focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Customers Table */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Customer Name</th>
                <th className="pb-2.5 font-medium">Contact</th>
                <th className="pb-2.5 font-medium">Address</th>
                <th className="pb-2.5 font-medium text-right">Credit Limit</th>
                <th className="pb-2.5 font-medium text-right">Current Balance</th>
                <th className="pb-2.5 font-medium text-right">Available</th>
                <th className="pb-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {customers
                .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
                .map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3 font-semibold text-foreground">{c.name}</td>
                    <td className="py-3 text-muted-foreground">
                      <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</p>
                      <p className="text-[10px] text-muted-foreground/80">{c.email}</p>
                    </td>
                    <td className="py-3 text-muted-foreground max-w-xs truncate">{c.address}</td>
                    <td className="py-3 text-right font-medium text-muted-foreground">
                      {c.creditAllowed ? `LKR ${c.creditLimit.toLocaleString()}` : <span className="text-[10px] text-muted-foreground/60">No Credit</span>}
                    </td>
                    <td className="py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                      LKR {c.currentBalance.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      LKR {(c.creditLimit - c.currentBalance).toLocaleString()}
                    </td>
                    <td className="py-3 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarath Perera"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Physical Delivery Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
                />
              </div>

              <div className="pt-2 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Allow Polim Potha Credit Sales</span>
                  <input
                    type="checkbox"
                    checked={creditAllowed}
                    onChange={(e) => setCreditAllowed(e.target.checked)}
                    className="h-4 w-4 rounded bg-secondary border-border text-primary focus:ring-0"
                  />
                </div>

                {creditAllowed && (
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Credit Limit (LKR)</label>
                    <input
                      type="number"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold"
                    />
                  </div>
                )}
              </div>
            </div>

            {saveSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Customer Profile Saved!</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
              >
                Save Customer
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
