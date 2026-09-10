'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  UploadCloud,
  Copy,
  Check,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Layers,
  X,
  Tag,
  FolderPlus,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';
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
  categoryId?: string | null;
  price: number;
  cost: number;
  stock: number;
  tax: string;
  imageUrl?: string | null;
  description?: string | null;
  isActive?: boolean;
  variants?: ProductVariant[];
  variantCount?: number;
}

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

interface MediaAsset {
  id: string;
  title: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes?: number;
  source?: string;
  createdAt: string;
}

function parseMoney(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export default function ProductsCRUDPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'media'>('catalog');

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [source, setSource] = useState<'api' | 'empty' | 'error'>('empty');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  // Categories State
  const [categoriesList, setCategoriesList] = useState<CategoryInfo[]>([]);

  // Selection & Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);
  const [bulkCategoryInput, setBulkCategoryInput] = useState('');
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Apparel');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [price, setPrice] = useState('3500');
  const [cost, setCost] = useState('1800');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Variants State
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [variantProductId, setVariantProductId] = useState<string | null>(null);
  const [variantName, setVariantName] = useState('');
  const [variantSku, setVariantSku] = useState('');
  const [variantStock, setVariantStock] = useState('0');
  const [variantPrice, setVariantPrice] = useState('');
  const [variantCost, setVariantCost] = useState('');
  const [matrixSizes, setMatrixSizes] = useState('S,M,L,XL');
  const [matrixColors, setMatrixColors] = useState('Red,Blue,Black');

  // Media Library State
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [autoAlignEnabled, setAutoAlignEnabled] = useState(true);
  const [autoAligning, setAutoAligning] = useState(false);
  const [alignSummary, setAlignSummary] = useState<string | null>(null);
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);
  const [mediaSearch, setMediaSearch] = useState('');

  const categoryInputRef = useRef<HTMLInputElement>(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategoriesList(data.categories);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const loadProducts = useCallback(async () => {
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

  const loadMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const res = await fetch('/api/media');
      const data = await res.json();
      if (data.success) {
        setMediaAssets(data.assets || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadMedia();
  }, [loadProducts, loadCategories, loadMedia]);

  const closeProductModal = useCallback(() => {
    if (busy) return;
    setIsModalOpen(false);
    setFormError(null);
    setSaveSuccess(false);
    setCategoryDropdownOpen(false);
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
    setCategory(categoriesList[0]?.name || 'Apparel');
    setCategoryDropdownOpen(false);
    setPrice('3500');
    setCost('1800');
    setImageUrl('');
    setDescription('');
    setFormError(null);
    setSaveSuccess(false);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode);
    setCategory(p.category || 'Uncategorized');
    setCategoryDropdownOpen(false);
    setPrice(String(p.price));
    setCost(String(p.cost));
    setImageUrl(p.imageUrl || '');
    setDescription(p.description || '');
    setFormError(null);
    setSaveSuccess(false);
    setIsModalOpen(true);
  };

  const handleModalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    setFormError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/media', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');
      setImageUrl(data.url);
      await loadMedia();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setIsUploadingImage(false);
    }
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
      const payload = {
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim(),
        category: category.trim(),
        price: sale,
        cost: cst,
        imageUrl: imageUrl.trim() || null,
        description: description.trim() || null,
      };
      const res = await fetch('/api/products', {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct ? { id: editingProduct.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSaveSuccess(true);
      await Promise.all([loadProducts(), loadCategories()]);
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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await Promise.all([loadProducts(), loadCategories()]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Bulk Operations Handlers
  const handleToggleSelectAll = (filteredIds: string[]) => {
    if (filteredIds.every((id) => selectedIds.has(id))) {
      // Deselect all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.add(id);
        return next;
      });
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to soft-delete ${selectedIds.size} selected products?`)) return;
    setBusy(true);
    setBulkSuccessMessage(null);
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          productIds: Array.from(selectedIds),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Bulk delete failed');
      setBulkSuccessMessage(`Successfully deleted ${data.count} products.`);
      setSelectedIds(new Set());
      await Promise.all([loadProducts(), loadCategories()]);
      setTimeout(() => setBulkSuccessMessage(null), 4000);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleBulkAssignCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    const catName = bulkCategoryInput.trim();
    if (!catName) {
      alert('Please enter or select a category name.');
      return;
    }
    setBusy(true);
    setBulkSuccessMessage(null);
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign-category',
          productIds: Array.from(selectedIds),
          category: catName,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Bulk category assignment failed');
      setBulkSuccessMessage(`Successfully assigned ${data.count} products to category "${catName}".`);
      setIsBulkCategoryModalOpen(false);
      setBulkCategoryInput('');
      setSelectedIds(new Set());
      await Promise.all([loadProducts(), loadCategories()]);
      setTimeout(() => setBulkSuccessMessage(null), 4000);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingMedia(true);
    setAlignSummary(null);

    let uploadedCount = 0;
    let autoAlignedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const form = new FormData();
        form.append('file', file);
        if (autoAlignEnabled) form.append('autoAlign', 'true');
        const res = await fetch('/api/media', {
          method: 'POST',
          body: form,
        });
        const data = await res.json();
        if (data.success) {
          uploadedCount++;
          if (data.autoAlign?.matched) autoAlignedCount++;
        }
      } catch {
        // Continue uploading rest
      }
    }

    await loadMedia();
    if (autoAlignedCount > 0) await loadProducts();

    setAlignSummary(
      `Uploaded ${uploadedCount} image${uploadedCount > 1 ? 's' : ''}${
        autoAlignedCount > 0 ? ` · Automatically matched & attached to ${autoAlignedCount} products by SKU/Name!` : ''
      }`
    );
    setUploadingMedia(false);
  };

  const handleBulkAutoAlign = async () => {
    setAutoAligning(true);
    setAlignSummary(null);
    try {
      const res = await fetch('/api/media/auto-align', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Auto-alignment failed');
      setAlignSummary(
        `Scanned ${data.totalAssets} media items: Successfully auto-aligned ${data.alignedCount} images with products!`
      );
      await loadProducts();
    } catch (err) {
      setAlignSummary(`Auto-align error: ${(err as Error).message}`);
    } finally {
      setAutoAligning(false);
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedAssetId(id);
    setTimeout(() => setCopiedAssetId(null), 2000);
  };

  const handleDeleteMedia = async (id: string) => {
    if (!confirm('Delete this media asset?')) return;
    try {
      const res = await fetch(`/api/media?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Delete failed');
      await loadMedia();
    } catch (err) {
      alert((err as Error).message);
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
      await loadProducts();
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
      await loadProducts();
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

  // Dynamic filter tabs
  const categoryFilters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (p.isActive === false) continue;
      const cat = p.category || 'Uncategorized';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    const list = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    list.sort((a, b) => b.count - a.count);
    return [{ name: 'ALL', count: products.filter((p) => p.isActive !== false).length }, ...list];
  }, [products]);

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        if (p.isActive === false) return false;
        if (selectedCategoryFilter !== 'ALL' && (p.category || 'Uncategorized') !== selectedCategoryFilter) {
          return false;
        }
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }),
    [products, search, selectedCategoryFilter],
  );

  const filteredIds = useMemo(() => filteredProducts.map((p) => p.id), [filteredProducts]);
  const isAllSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const isSomeSelected = filteredIds.some((id) => selectedIds.has(id)) && !isAllSelected;

  const filteredMedia = useMemo(
    () =>
      mediaAssets.filter(
        (m) =>
          m.title.toLowerCase().includes(mediaSearch.toLowerCase()) ||
          m.fileUrl.toLowerCase().includes(mediaSearch.toLowerCase()),
      ),
    [mediaAssets, mediaSearch],
  );

  const marginHint = (() => {
    const s = parseMoney(price);
    const c = parseMoney(cost);
    if (s === null || c === null || s === 0) return undefined;
    const m = ((s - c) / s) * 100;
    return `Margin ${m.toFixed(0)}%`;
  })();

  // Filtered categories for Combobox
  const matchingCategories = useMemo(() => {
    const term = category.trim().toLowerCase();
    if (!term) return categoriesList;
    return categoriesList.filter((c) => c.name.toLowerCase().includes(term));
  }, [categoriesList, category]);

  const bulkMatchingCategories = useMemo(() => {
    const term = bulkCategoryInput.trim().toLowerCase();
    if (!term) return categoriesList;
    return categoriesList.filter((c) => c.name.toLowerCase().includes(term));
  }, [categoriesList, bulkCategoryInput]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-foreground tracking-tight">Products & Media Manager</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
              POS · Storefront · Media CDN
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage catalog items, barcodes, prices, size/color variants, image assets, and bulk category assignments.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={busy}
            className="px-3.5 py-2 min-h-11 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export CSV
          </button>
          <Link
            href="/products/import"
            className="px-3.5 py-2 min-h-11 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border flex items-center gap-1.5"
          >
            <UploadCloud className="h-3.5 w-3.5" aria-hidden />
            Bulk CSV Import
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 min-h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New Product
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
            activeTab === 'catalog'
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Products Catalog ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('media');
            loadMedia();
          }}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
            activeTab === 'media'
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Media Library & Auto-Align ({mediaAssets.length})</span>
        </button>
      </div>

      {/* Alerts */}
      {(source === 'empty' || source === 'error' || error) && (
        <div
          role="status"
          className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs max-w-2xl"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error || 'No products yet — import a CSV or create a product.'}</span>
        </div>
      )}

      {bulkSuccessMessage && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{bulkSuccessMessage}</span>
          </div>
          <button type="button" onClick={() => setBulkSuccessMessage(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {alignSummary && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{alignSummary}</span>
          </div>
          <button type="button" onClick={() => setAlignSummary(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: PRODUCTS CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="product-search" className="sr-only">Search products</label>
              <input
                id="product-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product name, SKU, barcode, category…"
                className={`${staffInputClass} pl-9`}
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-3 text-xs text-muted-foreground hover:text-foreground font-bold"
                >
                  ✕
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              {categoryFilters.slice(0, 8).map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat.name)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategoryFilter === cat.name
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border'
                  }`}
                >
                  <span>{cat.name === 'ALL' ? 'All' : cat.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({cat.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-medium">
                  <th scope="col" className="pb-2.5 pl-1 w-8">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(filteredIds)}
                      className="p-1 rounded hover:bg-secondary text-foreground"
                      title={isAllSelected ? 'Deselect All' : 'Select All'}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : isSomeSelected ? (
                        <MinusSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="pb-2.5">Item</th>
                  <th scope="col" className="pb-2.5">Category</th>
                  <th scope="col" className="pb-2.5">SKU / Barcode</th>
                  <th scope="col" className="pb-2.5 text-right">Sale Price</th>
                  <th scope="col" className="pb-2.5 text-right">Cost</th>
                  <th scope="col" className="pb-2.5 text-right">Stock</th>
                  <th scope="col" className="pb-2.5">Variants</th>
                  <th scope="col" className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredProducts.map((p) => {
                  const isSelected = selectedIds.has(p.id);
                  return (
                    <React.Fragment key={p.id}>
                      <tr className={`hover:bg-secondary/40 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                        <td className="py-2.5 pl-1">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectRow(p.id)}
                            className="p-1 rounded hover:bg-secondary text-foreground"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt=""
                                className="w-9 h-9 rounded-lg object-cover bg-secondary border border-border/50 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-secondary/80 border border-border/40 flex items-center justify-center text-muted-foreground shrink-0">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate max-w-xs">{p.name}</p>
                              {p.description && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-xs">
                                  {p.description.replace(/<[^>]*>?/gm, '')}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary text-[11px] font-medium text-foreground border border-border">
                            <Tag className="w-2.5 h-2.5 text-primary" />
                            <span>{p.category || 'Uncategorized'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 font-mono">
                          <div className="text-primary font-bold">{p.sku}</div>
                          {p.barcode && p.barcode !== p.sku && (
                            <div className="text-[10px] text-muted-foreground">{p.barcode}</div>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-foreground">
                          Rs. {p.price.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 text-right font-mono text-muted-foreground">
                          Rs. {p.cost.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              p.stock > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            {p.stock}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                            aria-expanded={(p.variants?.length || 0) > 0 ? expandedId === p.id : undefined}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold"
                          >
                            {p.variantCount || p.variants?.length || 0} variants
                          </button>
                        </td>
                        <td className="py-2.5 text-right">
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
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20"
                            >
                              + Var
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="p-1.5 rounded-lg hover:bg-secondary text-foreground"
                              aria-label={`Edit ${p.name}`}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                              aria-label={`Delete ${p.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === p.id && (p.variants?.length || 0) > 0 && (
                        <tr>
                          <td colSpan={9} className="pb-3 px-2">
                            <div className="rounded-xl bg-secondary/50 border border-border p-3 space-y-1">
                              {p.variants?.map((v) => (
                                <div key={v.id} className="flex justify-between text-xs text-muted-foreground">
                                  <span>
                                    {v.name} · {v.sku}
                                  </span>
                                  <span>
                                    Rs. {v.price.toFixed(2)} · stock {v.stock}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FLOATING BULK ACTIONS TOOLBAR */}
      {selectedIds.size > 0 && activeTab === 'catalog' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 font-bold text-xs text-foreground pr-2 border-r border-border">
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-mono">
              {selectedIds.size}
            </span>
            <span>Selected</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setBulkCategoryInput('');
              setIsBulkCategoryModalOpen(true);
            }}
            disabled={busy}
            className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Assign Category</span>
          </button>

          <button
            type="button"
            onClick={() => void handleBulkDelete()}
            disabled={busy}
            className="px-3.5 py-2 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-destructive/90 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Clear Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 2: MEDIA LIBRARY & AUTO-ALIGN */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          {/* Top Upload Zone & Auto-Align Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Upload Box */}
            <div className="md:col-span-2 p-6 rounded-2xl bg-card border border-dashed border-border shadow-sm flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Upload Product Media Assets</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Drop images named after your SKU, Barcode, or Product Name (e.g.{' '}
                  <code className="text-primary font-mono">9837.jpg</code> or{' '}
                  <code className="text-primary font-mono">CTN-SHT-01.png</code>).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <input
                  id="media-bulk-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => void handleMediaUpload(e)}
                  disabled={uploadingMedia}
                  className="sr-only peer"
                />
                <label
                  htmlFor="media-bulk-upload"
                  className="cursor-pointer min-h-10 inline-flex items-center px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
                >
                  {uploadingMedia ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      <span>Uploading…</span>
                    </>
                  ) : (
                    <span>Choose Images to Upload</span>
                  )}
                </label>

                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoAlignEnabled}
                    onChange={(e) => setAutoAlignEnabled(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Auto-attach to product by SKU/Name on upload</span>
                </label>
              </div>
            </div>

            {/* Auto-Align Actions Box */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-foreground">1-Click Auto-Align</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Scans all media in your library and matches with products in catalog matching SKU numbers, barcodes, or titles.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleBulkAutoAlign()}
                disabled={autoAligning || mediaAssets.length === 0}
                className="w-full min-h-10 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs border border-border flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {autoAligning ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Auto-Aligning…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Auto-Align All Images with Products</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search & Media Grid */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder="Filter media by filename or link…"
                  className={`${staffInputClass} pl-9`}
                />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {filteredMedia.length} media asset{filteredMedia.length === 1 ? '' : 's'}
              </span>
            </div>

            {mediaLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground">Loading media assets…</div>
            ) : filteredMedia.length === 0 ? (
              <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-2">
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-xs font-semibold text-foreground">No media assets found</p>
                <p className="text-[11px] text-muted-foreground">
                  Upload product photos above to generate public CDN links and auto-align with products.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredMedia.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2.5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-2 group hover:border-primary/50 transition-all"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-secondary flex items-center justify-center">
                      <img
                        src={asset.fileUrl}
                        alt={asset.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-foreground truncate" title={asset.title}>
                        {asset.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate" title={asset.fileUrl}>
                        {asset.fileUrl}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(asset.fileUrl, asset.id)}
                        className={`flex-1 min-h-8 px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                          copiedAssetId === asset.id
                            ? 'bg-emerald-500 text-white'
                            : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border'
                        }`}
                        title="Copy direct image link to clipboard for Excel or product page"
                      >
                        {copiedAssetId === asset.id ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDeleteMedia(asset.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                        title="Delete asset"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BULK ASSIGN CATEGORY MODAL */}
      <Modal
        isOpen={isBulkCategoryModalOpen}
        onClose={() => setIsBulkCategoryModalOpen(false)}
        title={`Assign Category (${selectedIds.size} Products)`}
        description="Type to create or select a category to assign to all selected items."
        as="form"
        onSubmit={(e) => void handleBulkAssignCategory(e)}
        busy={busy}
        className="max-w-md"
      >
        <div className="space-y-4">
          <Field id="bulk-cat" label="Category Name" hint="Type to filter existing or create a new category.">
            <div className="relative">
              <input
                id="bulk-cat"
                required
                data-autofocus
                autoComplete="off"
                value={bulkCategoryInput}
                onChange={(e) => setBulkCategoryInput(e.target.value)}
                placeholder="e.g. Balloons, Apparel, Electronics…"
                className={staffInputClass}
              />
            </div>
          </Field>

          {/* Existing Quick Suggestions */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Existing Categories</p>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
              {bulkMatchingCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setBulkCategoryInput(c.name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    bulkCategoryInput === c.name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-foreground hover:bg-secondary/80 border-border'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>{c.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({c.productCount})</span>
                </button>
              ))}
              {bulkCategoryInput && !categoriesList.some((c) => c.name.toLowerCase() === bulkCategoryInput.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => {}}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/30"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>+ Create &quot;{bulkCategoryInput.trim()}&quot;</span>
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !bulkCategoryInput.trim()}
            className="w-full min-h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 hover:bg-primary/90 shadow-sm"
          >
            {busy ? 'Assigning…' : `Assign to ${selectedIds.size} Products`}
          </button>
        </div>
      </Modal>

      {/* EDIT / CREATE PRODUCT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeProductModal}
        title={editingProduct ? 'Edit Product' : 'New Product'}
        description="Title, SKU, barcode, image and prices sync to POS and public storefront."
        as="form"
        onSubmit={(e) => void handleSaveProduct(e)}
        busy={busy}
        className="max-w-xl"
      >
        <div className="space-y-5">
          {formError ? (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {formError}
            </p>
          ) : null}

          {/* Title & Description */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Product Information</h3>
            <Field id="prod-name" label="Product Name" hint="Customer-facing name on receipts and storefront.">
              <input
                id="prod-name"
                data-autofocus
                required
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={staffInputClass}
                placeholder="e.g. Happy Birthday Foil Balloon Under the Sea"
              />
            </Field>

            <Field id="prod-desc" label="Description (Optional)">
              <textarea
                id="prod-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={staffInputClass}
                placeholder="Short product details, materials, or features"
              />
            </Field>
          </section>

          {/* Product Image Upload & Preview */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Product Image</h3>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40 border border-border">
              {imageUrl ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-secondary border border-border shrink-0">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black"
                    title="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground shrink-0">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    id="modal-image-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleModalImageUpload(e)}
                    disabled={isUploadingImage}
                    className="sr-only"
                  />
                  <label
                    htmlFor="modal-image-file"
                    className="cursor-pointer px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 inline-flex items-center gap-1.5"
                  >
                    {isUploadingImage ? <RefreshCw className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
                    <span>{imageUrl ? 'Change Image' : 'Upload Image'}</span>
                  </label>
                </div>

                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste public image URL"
                  className={`${staffInputClass} text-xs font-mono`}
                />
              </div>
            </div>
          </section>

          {/* Identification & Interactive Category Combobox */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Identification & Category</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field id="prod-sku" label="SKU" hint="Unique stock keeping unit.">
                <input
                  id="prod-sku"
                  required
                  autoComplete="off"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className={`${staffInputClass} font-mono`}
                />
              </Field>
              <Field id="prod-barcode" label="Barcode" hint="EAN/UPC — keep as text for barcode scanners.">
                <input
                  id="prod-barcode"
                  inputMode="numeric"
                  autoComplete="off"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className={`${staffInputClass} font-mono`}
                />
              </Field>
            </div>

            {/* Type & Get Category Combobox */}
            <Field id="prod-cat" label="Category (Type & Get)" hint="Select from existing categories or type a new one.">
              <div className="relative">
                <div className="flex items-center relative">
                  <input
                    ref={categoryInputRef}
                    id="prod-cat"
                    required
                    autoComplete="off"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setCategoryDropdownOpen(true);
                    }}
                    onFocus={() => setCategoryDropdownOpen(true)}
                    className={`${staffInputClass} pr-9`}
                    placeholder="Type or select a category…"
                  />
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground"
                    title="Toggle category list"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {categoryDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-card border border-border shadow-xl p-1 divide-y divide-border/40 animate-in fade-in duration-150">
                    {matchingCategories.length > 0 ? (
                      matchingCategories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCategory(c.name);
                            setCategoryDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                            category.toLowerCase() === c.name.toLowerCase()
                              ? 'bg-primary/10 text-primary font-bold'
                              : 'hover:bg-secondary text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 opacity-70" />
                            <span>{c.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {c.productCount} item{c.productCount === 1 ? '' : 's'}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No existing category matches.</div>
                    )}

                    {category.trim() && !categoriesList.some((c) => c.name.toLowerCase() === category.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => setCategoryDropdownOpen(false)}
                        className="w-full px-3 py-2 rounded-lg text-left text-xs text-primary font-bold hover:bg-primary/10 flex items-center gap-2"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Create new category &quot;{category.trim()}&quot;</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Field>
          </section>

          {/* Pricing */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pricing (LKR)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field id="prod-price" label="Sale price" hint={marginHint}>
                <input
                  id="prod-price"
                  inputMode="decimal"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={`${staffInputClass} font-mono`}
                />
              </Field>
              <Field id="prod-cost" label="Cost">
                <input
                  id="prod-cost"
                  inputMode="decimal"
                  required
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className={`${staffInputClass} font-mono`}
                />
              </Field>
            </div>
          </section>

          <p role="status" aria-live="polite" className="text-sm text-emerald-600 font-bold flex items-center gap-2 min-h-5">
            {saveSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Saved Successfully!
              </>
            ) : null}
          </p>
          <button
            type="submit"
            disabled={busy || saveSuccess}
            className="w-full min-h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 hover:bg-primary/90 shadow-sm"
          >
            {busy ? 'Saving…' : editingProduct ? 'Update Product' : 'Save Product'}
          </button>
        </div>
      </Modal>

      {/* VARIANT MODAL */}
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
            <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {variantError}
            </p>
          ) : null}
          <Field id="var-name" label="Variant label" hint="Example: Size L / Blue">
            <input
              id="var-name"
              data-autofocus
              required
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              className={staffInputClass}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="var-sku" label="Variant SKU">
              <input
                id="var-sku"
                required
                value={variantSku}
                onChange={(e) => setVariantSku(e.target.value)}
                className={`${staffInputClass} font-mono`}
              />
            </Field>
            <Field id="var-stock" label="Initial stock">
              <input
                id="var-stock"
                inputMode="numeric"
                value={variantStock}
                onChange={(e) => setVariantStock(e.target.value)}
                className={`${staffInputClass} font-mono`}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="var-price" label="Sale price">
              <input
                id="var-price"
                inputMode="decimal"
                required
                value={variantPrice}
                onChange={(e) => setVariantPrice(e.target.value)}
                className={`${staffInputClass} font-mono`}
              />
            </Field>
            <Field id="var-cost" label="Cost">
              <input
                id="var-cost"
                inputMode="decimal"
                required
                value={variantCost}
                onChange={(e) => setVariantCost(e.target.value)}
                className={`${staffInputClass} font-mono`}
              />
            </Field>
          </div>
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-semibold text-primary">Size × Color matrix</p>
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
              className="w-full min-h-11 rounded-xl bg-secondary text-foreground text-sm font-bold disabled:opacity-50 border border-border"
            >
              Generate matrix variants
            </button>
          </div>
          <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
            {busy ? 'Saving…' : 'Save variant'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
