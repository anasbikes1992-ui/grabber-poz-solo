'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Field, staffInputClass } from '@/components/ui/field';

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  cost: number;
  stock: number;
  active?: boolean;
}

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
  variants?: ProductVariant[];
  variantCount?: number;
}

function parseMoney(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export default function ProductsCRUDPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [source, setSource] = useState<'api' | 'empty' | 'error'>('empty');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Apparel');
  const [price, setPrice] = useState('3500');
  const [cost, setCost] = useState('1800');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [variantProductId, setVariantProductId] = useState<string | null>(null);
  const [variantName, setVariantName] = useState('');
  const [variantSku, setVariantSku] = useState('');
  const [variantStock, setVariantStock] = useState('0');
  const [variantPrice, setVariantPrice] = useState('');
  const [variantCost, setVariantCost] = useState('');
  const [matrixSizes, setMatrixSizes] = useState('S,M,L,XL');
  const [matrixColors, setMatrixColors] = useState('Red,Blue,Black');

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

  const closeProductModal = useCallback(() => {
    if (busy) return;
    setIsModalOpen(false);
    setFormError(null);
    setSaveSuccess(false);
  }, [busy]);

  const closeVariantModal = useCallback(() => {
    if (busy) return;
    setVariantProductId(null);
    setVariantError(null);
  }, [busy]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Date.now().toString().slice(-4)}`);
    setBarcode(`890123${Date.now().toString().slice(-7)}`);
    setCategory('Apparel');
    setPrice('3500');
    setCost('1800');
    setFormError(null);
    setSaveSuccess(false);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode);
    setCategory(p.category);
    setPrice(String(p.price));
    setCost(String(p.cost));
    setFormError(null);
    setSaveSuccess(false);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const sale = parseMoney(price);
    const cst = parseMoney(cost);
    if (!name.trim()) {
      setFormError('Product name is required.');
      window.requestAnimationFrame(() => document.getElementById('prod-name')?.focus());
      return;
    }
    if (sale === null) {
      setFormError('Enter a valid sale price (0 or more).');
      window.requestAnimationFrame(() => document.getElementById('prod-price')?.focus());
      return;
    }
    if (cst === null) {
      setFormError('Enter a valid cost (0 or more).');
      window.requestAnimationFrame(() => document.getElementById('prod-cost')?.focus());
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const payload = { name: name.trim(), sku: sku.trim(), barcode: barcode.trim(), category: category.trim(), price: sale, cost: cst };
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
      }, 700);
    } catch (err) {
      setFormError((err as Error).message);
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

  const handleMatrixGenerate = async (productId: string) => {
    setBusy(true);
    setVariantError(null);
    try {
      const sizes = matrixSizes.split(',').map((s) => s.trim()).filter(Boolean);
      const colors = matrixColors.split(',').map((c) => c.trim()).filter(Boolean);
      const res = await fetch('/api/products/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, sizes, colors }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Matrix generation failed');
      await load();
    } catch (err) {
      setVariantError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantProductId) return;
    const sale = parseMoney(variantPrice);
    const cst = parseMoney(variantCost);
    const stock = parseMoney(variantStock);
    if (!variantName.trim()) {
      setVariantError('Variant label is required (e.g. Size L / Blue).');
      return;
    }
    if (sale === null || cst === null || stock === null) {
      setVariantError('Enter valid sale price, cost, and stock.');
      return;
    }
    setBusy(true);
    setVariantError(null);
    try {
      const res = await fetch('/api/products/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: variantProductId,
          name: variantName.trim(),
          sku: variantSku.trim(),
          salePrice: sale,
          costPrice: cst,
          stock,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Variant save failed');
      setVariantProductId(null);
      setVariantName('');
      setVariantSku('');
      setVariantStock('0');
      await load();
    } catch (err) {
      setVariantError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleExportCsv = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/products/export');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `grabber-products-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.isActive !== false &&
          (p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            p.barcode.toLowerCase().includes(search.toLowerCase())),
      ),
    [products, search],
  );

  const marginHint = (() => {
    const s = parseMoney(price);
    const c = parseMoney(cost);
    if (s === null || c === null || s === 0) return undefined;
    const m = ((s - c) / s) * 100;
    return `Margin ${m.toFixed(0)}%`;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Products & Variants</h2>
          <p className="text-sm text-muted-foreground mt-1">Catalog, SKUs, barcodes, and size/color variants — same stock as POS and storefront.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={busy}
            className="px-3.5 py-2 min-h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-foreground font-semibold text-xs border border-zinc-800 flex items-center gap-1.5 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export CSV
          </button>
          <Link
            href="/products/import"
            className="px-3.5 py-2 min-h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-foreground font-semibold text-xs border border-zinc-800 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Import CSV
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 min-h-11 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs flex items-center gap-2 shadow-glow-em focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New Product
          </button>
        </div>
      </div>

      {(source === 'empty' || source === 'error' || error) && (
        <div
          role="status"
          className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm max-w-2xl"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error || 'No products yet — run POST /api/seed or create one.'}</span>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <input
          id="product-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, SKU, barcode…"
          className={`${staffInputClass} pl-9`}
        />
      </div>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground text-xs uppercase tracking-wide">
              <th scope="col" className="pb-2.5 font-medium">Product</th>
              <th scope="col" className="pb-2.5 font-medium">SKU</th>
              <th scope="col" className="pb-2.5 font-medium text-right">Sale</th>
              <th scope="col" className="pb-2.5 font-medium text-right">Cost</th>
              <th scope="col" className="pb-2.5 font-medium text-right">Stock</th>
              <th scope="col" className="pb-2.5 font-medium">Variants</th>
              <th scope="col" className="pb-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map((p) => (
              <React.Fragment key={p.id}>
                <tr className="hover:bg-zinc-900/60">
                  <td className="py-3 font-semibold text-foreground">{p.name}</td>
                  <td className="py-3 font-mono text-muted-foreground text-xs">{p.sku}</td>
                  <td className="py-3 text-right font-mono text-xs">{p.price.toFixed(2)}</td>
                  <td className="py-3 text-right font-mono text-xs">{p.cost.toFixed(2)}</td>
                  <td className="py-3 text-right font-mono text-xs">{p.stock}</td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      aria-expanded={(p.variants?.length || 0) > 0 ? expandedId === p.id : undefined}
                      aria-controls={(p.variants?.length || 0) > 0 ? `variants-${p.id}` : undefined}
                      className="text-xs min-h-11 px-3 rounded-lg bg-zinc-800 text-zinc-300 focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      {(p.variantCount || p.variants?.length || 0)} variants
                    </button>
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setVariantProductId(p.id);
                          setVariantName('');
                          setVariantSku(`${p.sku}-VAR`);
                          setVariantStock('0');
                          setVariantPrice(String(p.price));
                          setVariantCost(String(p.cost));
                          setVariantError(null);
                        }}
                        className="text-xs min-h-11 px-3 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        + Variant
                      </button>
                      <button type="button" onClick={() => openEditModal(p)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label={`Edit ${p.name}`}>
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDeleteProduct(p.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-zinc-800 text-destructive focus-visible:ring-2 focus-visible:ring-red-500" aria-label={`Delete ${p.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === p.id && (p.variants?.length || 0) > 0 && (
                  <tr>
                    <td colSpan={7} className="pb-3 px-2">
                      <div id={`variants-${p.id}`} className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-3 space-y-1">
                        {p.variants?.map((v) => (
                          <div key={v.id} className="flex justify-between text-xs text-muted-foreground">
                            <span>{v.name} · {v.sku}</span>
                            <span>LKR {v.price.toFixed(2)} · stock {v.stock}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeProductModal}
        title={editingProduct ? 'Edit product' : 'New product'}
        description="Title, SKU, barcode and prices sync to POS and the public storefront."
        as="form"
        onSubmit={(e) => void handleSaveProduct(e)}
        busy={busy}
        className="max-w-xl"
      >
        <div className="space-y-5">
          {formError ? (
            <p role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {formError}
            </p>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Title</h3>
            <Field id="prod-name" label="Name" hint="Customer-facing name on receipts and storefront.">
              <input
                id="prod-name"
                data-autofocus
                required
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={staffInputClass}
              />
            </Field>
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Identification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field id="prod-sku" label="SKU" hint="Unique stock keeping unit.">
                <input id="prod-sku" required autoComplete="off" value={sku} onChange={(e) => setSku(e.target.value)} className={`${staffInputClass} font-mono`} />
              </Field>
              <Field id="prod-barcode" label="Barcode" hint="EAN/UPC — keep as text so Excel does not use scientific notation.">
                <input id="prod-barcode" inputMode="numeric" autoComplete="off" value={barcode} onChange={(e) => setBarcode(e.target.value)} className={`${staffInputClass} font-mono`} />
              </Field>
            </div>
            <Field id="prod-cat" label="Category">
              <input id="prod-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={staffInputClass} />
            </Field>
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pricing (LKR)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field id="prod-price" label="Sale price" hint={marginHint}>
                <input id="prod-price" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} className={`${staffInputClass} font-mono`} />
              </Field>
              <Field id="prod-cost" label="Cost">
                <input id="prod-cost" inputMode="decimal" required value={cost} onChange={(e) => setCost(e.target.value)} className={`${staffInputClass} font-mono`} />
              </Field>
            </div>
          </section>

          <p role="status" aria-live="polite" className="text-sm text-emerald-400 flex items-center gap-2 min-h-5">
            {saveSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Saved
              </>
            ) : null}
          </p>
          <button
            type="submit"
            disabled={busy || saveSuccess}
            className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-bold disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {busy ? 'Saving…' : editingProduct ? 'Update product' : 'Save product'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!variantProductId}
        onClose={closeVariantModal}
        title="Add product variant"
        description="One option (size/color) or generate a size × color matrix."
        as="form"
        onSubmit={(e) => void handleAddVariant(e)}
        busy={busy}
        className="max-w-xl"
      >
        <div className="space-y-4">
          {variantError ? (
            <p role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {variantError}
            </p>
          ) : null}
          <Field id="var-name" label="Variant label" hint='Example: Size L / Blue'>
            <input id="var-name" data-autofocus required value={variantName} onChange={(e) => setVariantName(e.target.value)} className={staffInputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="var-sku" label="Variant SKU">
              <input id="var-sku" required value={variantSku} onChange={(e) => setVariantSku(e.target.value)} className={`${staffInputClass} font-mono`} />
            </Field>
            <Field id="var-stock" label="Initial stock">
              <input id="var-stock" inputMode="numeric" value={variantStock} onChange={(e) => setVariantStock(e.target.value)} className={`${staffInputClass} font-mono`} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="var-price" label="Sale price">
              <input id="var-price" inputMode="decimal" required value={variantPrice} onChange={(e) => setVariantPrice(e.target.value)} className={`${staffInputClass} font-mono`} />
            </Field>
            <Field id="var-cost" label="Cost">
              <input id="var-cost" inputMode="decimal" required value={variantCost} onChange={(e) => setVariantCost(e.target.value)} className={`${staffInputClass} font-mono`} />
            </Field>
          </div>
          <div className="border-t border-zinc-800 pt-4 space-y-3">
            <p className="text-xs font-semibold text-emerald-400">Size × Color matrix</p>
            <Field id="var-sizes" label="Sizes" hint="Comma-separated">
              <input id="var-sizes" value={matrixSizes} onChange={(e) => setMatrixSizes(e.target.value)} className={staffInputClass} />
            </Field>
            <Field id="var-colors" label="Colors" hint="Comma-separated">
              <input id="var-colors" value={matrixColors} onChange={(e) => setMatrixColors(e.target.value)} className={staffInputClass} />
            </Field>
            <button
              type="button"
              disabled={busy || !variantProductId}
              onClick={() => variantProductId && void handleMatrixGenerate(variantProductId)}
              className="w-full min-h-11 rounded-xl bg-zinc-800 text-sm font-bold disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Generate matrix variants
            </button>
          </div>
          <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-bold disabled:opacity-50">
            {busy ? 'Saving…' : 'Save variant'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
