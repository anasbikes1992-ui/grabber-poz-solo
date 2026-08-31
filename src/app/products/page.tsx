'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  tax: string;
  isActive?: boolean;
}

export default function ProductsCRUDPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [source, setSource] = useState<'api' | 'empty' | 'error'>('empty');
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Apparel');
  const [price, setPrice] = useState(4500);
  const [cost, setCost] = useState(2500);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Load failed');
      setProducts(data.products || []);
      setSource(data.products?.length ? 'api' : 'empty');
      setError(null);
    } catch (err) {
      setSource('error');
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Date.now().toString().slice(-4)}`);
    setBarcode(`890123${Date.now().toString().slice(-7)}`);
    setCategory('Apparel');
    setPrice(3500);
    setCost(1800);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode);
    setCategory(p.category);
    setPrice(p.price);
    setCost(p.cost);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = { name, sku, barcode, category, price: Number(price), cost: Number(cost) };
      const res = await fetch('/api/products', {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct ? { id: editingProduct.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSaveSuccess(true);
      await load();
      setTimeout(() => {
        setIsModalOpen(false);
        setSaveSuccess(false);
      }, 600);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Soft-delete this product (set inactive)?')) return;
    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Delete failed');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.isActive !== false &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Products & Variants Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Durable catalog via /api/products</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Link
            href="/products/import"
            className="px-3.5 py-2 min-h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-foreground font-semibold text-xs border border-zinc-800 flex items-center gap-1.5"
          >
            Import Excel / CSV
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 min-h-11 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs flex items-center gap-2 shadow-glow-em"
          >
            <Plus className="h-3.5 w-3.5" />
            New Product
          </button>
        </div>
      </div>

      {(source === 'empty' || source === 'error' || error) && (
        <div
          role="status"
          className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs max-w-2xl"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            {error || 'No products yet — run POST /api/seed or create one.'}
          </span>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <input
          id="product-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, SKU, barcode…"
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-zinc-900/80 border border-zinc-800"
        />
      </div>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2.5 font-medium">Product</th>
              <th className="pb-2.5 font-medium">SKU</th>
              <th className="pb-2.5 font-medium text-right">Sale</th>
              <th className="pb-2.5 font-medium text-right">Cost</th>
              <th className="pb-2.5 font-medium text-right">Stock</th>
              <th className="pb-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-900/60">
                <td className="py-3 font-semibold text-foreground">{p.name}</td>
                <td className="py-3 font-mono text-muted-foreground">{p.sku}</td>
                <td className="py-3 text-right font-mono">{p.price.toFixed(2)}</td>
                <td className="py-3 text-right font-mono">{p.cost.toFixed(2)}</td>
                <td className="py-3 text-right font-mono">{p.stock}</td>
                <td className="py-3 text-right space-x-2">
                  <button type="button" onClick={() => openEditModal(p)} className="inline-flex p-1.5 rounded-lg hover:bg-zinc-800" aria-label={`Edit ${p.name}`}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDeleteProduct(p.id)} className="inline-flex p-1.5 rounded-lg hover:bg-zinc-800 text-destructive" aria-label={`Delete ${p.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !busy && setIsModalOpen(false)} title={editingProduct ? 'Edit product' : 'New product'} as="form" onSubmit={handleSaveProduct}>
        <div className="space-y-3">
          <div>
            <label htmlFor="prod-name" className="text-xs font-semibold block mb-1">Name</label>
            <input id="prod-name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="prod-sku" className="text-xs font-semibold block mb-1">SKU</label>
              <input id="prod-sku" required value={sku} onChange={(e) => setSku(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono" />
            </div>
            <div>
              <label htmlFor="prod-barcode" className="text-xs font-semibold block mb-1">Barcode</label>
              <input id="prod-barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono" />
            </div>
          </div>
          <div>
            <label htmlFor="prod-cat" className="text-xs font-semibold block mb-1">Category</label>
            <input id="prod-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="prod-price" className="text-xs font-semibold block mb-1">Sale price</label>
              <input id="prod-price" type="number" required value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono" />
            </div>
            <div>
              <label htmlFor="prod-cost" className="text-xs font-semibold block mb-1">Cost</label>
              <input id="prod-cost" type="number" required value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono" />
            </div>
          </div>
          {saveSuccess ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Saved</p>
          ) : (
            <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50">
              {busy ? 'Saving…' : 'Save product'}
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
