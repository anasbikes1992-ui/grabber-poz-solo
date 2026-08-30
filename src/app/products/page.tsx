'use client';

import React, { useState } from 'react';
import { Package, Plus, Search, Edit2, Trash2, Tag, CheckCircle2, X } from 'lucide-react';

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
}

export default function ProductsCRUDPage() {
  const [products, setProducts] = useState<Product[]>([
    { id: 'p1', name: 'Linen Casual Shirt', sku: 'LNN-SHT-BLU-L', barcode: '8901234567890', category: 'Apparel', price: 4500.0, cost: 2500.0, stock: 76, tax: 'STANDARD_VAT (18%)' },
    { id: 'p2', name: 'Oxford Button-Down', sku: 'OXF-SHT-WHT-M', barcode: '8901234567891', category: 'Apparel', price: 5200.0, cost: 2800.0, stock: 68, tax: 'STANDARD_VAT (18%)' },
    { id: 'p3', name: 'Stretch Chino Trousers', sku: 'STC-CHN-KHK-32', barcode: '8901234567892', category: 'Bottoms', price: 6500.0, cost: 3400.0, stock: 24, tax: 'STANDARD_VAT (18%)' },
    { id: 'p4', name: 'Pique Cotton Polo', sku: 'PIQ-POL-NVY-XL', barcode: '8901234567893', category: 'Apparel', price: 3800.0, cost: 1900.0, stock: 12, tax: 'STANDARD_VAT (18%)' },
  ]);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Apparel');
  const [price, setPrice] = useState(4500);
  const [cost, setCost] = useState(2500);

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

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? { ...p, name, sku, barcode, category, price: Number(price), cost: Number(cost) }
            : p
        )
      );
    } else {
      const newP: Product = {
        id: `p_${Date.now()}`,
        name,
        sku,
        barcode,
        category,
        price: Number(price),
        cost: Number(cost),
        stock: 0,
        tax: 'STANDARD_VAT (18%)',
      };
      setProducts((prev) => [...prev, newP]);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setSaveSuccess(false);
    }, 800);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Products & Variants Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create, edit, price, and assign tax profiles to products and SKU variants.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Product</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name, SKU, or barcode..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-card border border-border focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Products Table */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Product / SKU</th>
                <th className="pb-2.5 font-medium">Barcode</th>
                <th className="pb-2.5 font-medium">Category</th>
                <th className="pb-2.5 font-medium text-right">Cost Price</th>
                <th className="pb-2.5 font-medium text-right">Sale Price</th>
                <th className="pb-2.5 font-medium text-right">On-Hand Stock</th>
                <th className="pb-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {products
                .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
                .map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3">
                      <p className="font-semibold text-foreground">{p.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{p.sku}</p>
                    </td>
                    <td className="py-3 font-mono text-muted-foreground">{p.barcode}</td>
                    <td className="py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-secondary font-medium text-muted-foreground">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium text-muted-foreground">LKR {p.cost.toFixed(2)}</td>
                    <td className="py-3 text-right font-bold text-foreground">LKR {p.price.toFixed(2)}</td>
                    <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{p.stock}</td>
                    <td className="py-3 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
          <form onSubmit={handleSaveProduct} className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Linen Casual Shirt"
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Barcode</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Cost Price (LKR)</label>
                  <input
                    type="number"
                    required
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Sale Price (LKR)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Tax Profile</label>
                <select className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-medium">
                  <option>STANDARD_VAT (Sri Lankan VAT 18%)</option>
                  <option>ZERO_RATED (0%)</option>
                </select>
              </div>
            </div>

            {saveSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Product Saved Successfully!</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
              >
                Save Product
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
