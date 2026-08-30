'use client';

import React, { useState } from 'react';
import { Building2, Plus, Search, Edit2, CheckCircle2, X, Phone, Mail, FileText } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  paymentTerms: string;
  currentBalance: number;
}

export default function SuppliersCRUDPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: 's1', name: 'Lanka Textiles Ltd', contactName: 'Rohan Wickramasinghe', phone: '+94 11 255 6677', email: 'sales@lankatextiles.lk', paymentTerms: 'NET_30', currentBalance: 250000.0 },
    { id: 's2', name: 'Ceylon Garments Co.', contactName: 'Sunil Mendis', phone: '+94 11 788 9900', email: 'info@ceylongarments.com', paymentTerms: 'NET_15', currentBalance: 140000.0 },
    { id: 's3', name: 'Colombo Buttons & Trims', contactName: 'Ajantha Fernando', phone: '+94 77 444 3322', email: 'orders@colombobuttons.lk', paymentTerms: 'NET_30', currentBalance: 0.0 },
  ]);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('NET_30');

  const openCreateModal = () => {
    setEditingSupplier(null);
    setName('');
    setContactName('');
    setPhone('+94 ');
    setEmail('');
    setPaymentTerms('NET_30');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactName(s.contactName);
    setPhone(s.phone);
    setEmail(s.email);
    setPaymentTerms(s.paymentTerms);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === editingSupplier.id
            ? { ...s, name, contactName, phone, email, paymentTerms }
            : s
        )
      );
    } else {
      const newS: Supplier = {
        id: `s_${Date.now()}`,
        name,
        contactName,
        phone,
        email,
        paymentTerms,
        currentBalance: 0,
      };
      setSuppliers((prev) => [...prev, newS]);
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
          <h2 className="text-xl font-bold text-foreground tracking-tight">Suppliers Directory & Accounts Payable</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vendor profiles, credit terms, and supplier payables ledger accounts.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Supplier</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by supplier name, contact, or email..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-card border border-border focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Suppliers Table */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Supplier</th>
                <th className="pb-2.5 font-medium">Primary Contact</th>
                <th className="pb-2.5 font-medium">Payment Terms</th>
                <th className="pb-2.5 font-medium text-right">Outstanding Payable</th>
                <th className="pb-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {suppliers
                .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.contactName.toLowerCase().includes(search.toLowerCase()))
                .map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3 font-semibold text-foreground">{s.name}</td>
                    <td className="py-3 text-muted-foreground">
                      <p className="text-foreground font-medium">{s.contactName}</p>
                      <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</p>
                    </td>
                    <td className="py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-secondary font-semibold text-foreground">
                        {s.paymentTerms}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-purple-600 dark:text-purple-400">
                      LKR {s.currentBalance.toLocaleString()}
                    </td>
                    <td className="py-3 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(s)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Company Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lanka Textiles Ltd"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Contact Person</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Rohan Wickramasinghe"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Phone</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
                  >
                    <option value="NET_15">Net 15 Days</option>
                    <option value="NET_30">Net 30 Days</option>
                    <option value="NET_60">Net 60 Days</option>
                    <option value="COD">Cash On Delivery</option>
                  </select>
                </div>
              </div>
            </div>

            {saveSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Supplier Profile Saved!</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
              >
                Save Supplier
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
