'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Apple,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Layers,
  ArrowUpDown,
  Calendar,
  Building2,
  PackageCheck,
  ShieldAlert,
} from 'lucide-react';
import { AppHeader } from '@/components/ui/app-header';
import { Modal } from '@/components/ui/modal';

type Lot = {
  id: string;
  batchCode: string;
  productId: string;
  productName: string;
  productSku: string;
  productImageUrl?: string | null;
  productSalePrice: number;
  variantId?: string | null;
  variantName?: string | null;
  locationType: 'BRANCH' | 'WAREHOUSE';
  locationId: string;
  locationName: string;
  qtyOnHand: number;
  expiryDate?: string | null;
  receivedAt?: string | null;
  daysToExpiry?: number | null;
  status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD' | 'NO_EXPIRY';
};

type Summary = {
  totalLots: number;
  totalUnits: number;
  expiredCount: number;
  criticalCount: number;
  warningCount: number;
  goodCount: number;
};

type Loc = {
  id: string;
  name: string;
  type: 'BRANCH' | 'WAREHOUSE';
};

type SimpleProduct = {
  id: string;
  name: string;
  sku: string;
  costPrice?: string | number;
};

export default function GroceryLotsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalLots: 0,
    totalUnits: 0,
    expiredCount: 0,
    criticalCount: 0,
    warningCount: 0,
    goodCount: 0,
  });
  const [locations, setLocations] = useState<Loc[]>([]);
  const [productsList, setProductsList] = useState<SimpleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal: Receive Batch
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [batchCode, setBatchCode] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [qty, setQty] = useState(10);
  const [unitCost, setUnitCost] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Promo markdown suggestion state
  const [suggesting, setSuggesting] = useState(false);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);

  const fetchLots = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (locationFilter) params.set('locationId', locationFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/grocery/lots?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch lots');

      setLots(data.lots || []);
      if (data.summary) setSummary(data.summary);

      const allLocs: Loc[] = [
        ...(data.locations?.branches || []),
        ...(data.locations?.warehouses || []),
      ];
      setLocations(allLocs);
      if (!selectedLocationId && allLocs.length > 0) {
        setSelectedLocationId(allLocs[0].id);
      }
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, locationFilter, searchQuery, selectedLocationId]);

  // Load product catalog for dropdown
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      const data = await res.json();
      if (data.success && data.products) {
        setProductsList(data.products);
        if (data.products.length > 0 && !selectedProductId) {
          setSelectedProductId(data.products[0].id);
          if (data.products[0].costPrice) {
            setUnitCost(String(data.products[0].costPrice));
          }
        }
      }
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchLots();
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenReceiveModal = () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setBatchCode(`LOT-${todayStr}-${rand}`);
    setQty(10);
    setFormMsg(null);
    setIsModalOpen(true);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedLocationId || !batchCode.trim()) {
      setFormMsg({ type: 'error', text: 'Product, location, and batch code are required' });
      return;
    }

    const loc = locations.find((l) => l.id === selectedLocationId);
    setSubmitting(true);
    setFormMsg(null);

    try {
      const res = await fetch('/api/grocery/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchCode: batchCode.trim(),
          productId: selectedProductId,
          locationType: loc?.type || 'BRANCH',
          locationId: selectedLocationId,
          qty: Number(qty),
          unitCost: unitCost ? Number(unitCost) : 0,
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to receive batch');

      setFormMsg({ type: 'success', text: data.message || 'Batch received successfully!' });
      setTimeout(() => {
        setIsModalOpen(false);
        fetchLots();
      }, 1000);
    } catch (err: unknown) {
      setFormMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestPromos = async () => {
    setSuggesting(true);
    setPromoMsg(null);
    try {
      const res = await fetch('/api/grocery/promos', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to trigger recommendations');
      setPromoMsg(data.message);
      setTimeout(() => setPromoMsg(null), 5000);
    } catch (err: unknown) {
      setPromoMsg(`Error: ${(err as Error).message}`);
    } finally {
      setSuggesting(false);
    }
  };

  const getStatusBadge = (lot: Lot) => {
    switch (lot.status) {
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 border border-rose-200">
            <AlertTriangle className="h-3 w-3 text-rose-600" />
            Expired {Math.abs(lot.daysToExpiry || 0)}d ago
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-700 animate-pulse" />
            Expires in {lot.daysToExpiry}d (Critical)
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 border border-yellow-200">
            <Clock className="h-3 w-3 text-yellow-600" />
            Expires in {lot.daysToExpiry}d
          </span>
        );
      case 'GOOD':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            {lot.daysToExpiry ? `${lot.daysToExpiry}d remaining` : 'Good'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            No Expiry Set
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <Apple className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Grocery Lots & FEFO Radar
                </h1>
                <p className="text-sm text-slate-500">
                  First-Expired-First-Out batch tracking, expiry countdowns, and automated FMCG markdowns.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSuggestPromos}
              disabled={suggesting}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100 transition"
              title="Detect lots expiring within 7 days and configure automated markdown campaigns"
            >
              <Sparkles className={`h-4 w-4 text-amber-600 ${suggesting ? 'animate-spin' : ''}`} />
              {suggesting ? 'Analyzing...' : 'Markdown Suggestions'}
            </button>

            <button
              onClick={handleOpenReceiveModal}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition"
            >
              <Plus className="h-4 w-4" />
              Receive Batch (FEFO)
            </button>
          </div>
        </div>

        {promoMsg && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <span>{promoMsg}</span>
            </div>
            <button
              onClick={() => setPromoMsg(null)}
              className="text-xs font-semibold underline text-amber-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Expiry Radar KPI Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Lots</span>
              <Layers className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.totalLots}</p>
            <p className="text-xs text-slate-400 mt-1">{summary.totalUnits} units on-hand</p>
          </div>

          <div
            onClick={() => {
              setStatusFilter('EXPIRED');
              fetchLots();
            }}
            className={`rounded-2xl border p-4 shadow-sm cursor-pointer transition ${
              statusFilter === 'EXPIRED'
                ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-300'
                : 'border-slate-200 bg-white hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-700">Expired</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-600">{summary.expiredCount}</p>
            <p className="text-xs text-rose-500 mt-1">Requires write-off</p>
          </div>

          <div
            onClick={() => {
              setStatusFilter('CRITICAL');
              fetchLots();
            }}
            className={`rounded-2xl border p-4 shadow-sm cursor-pointer transition ${
              statusFilter === 'CRITICAL'
                ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300'
                : 'border-slate-200 bg-white hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-800">Critical (≤7d)</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-600">{summary.criticalCount}</p>
            <p className="text-xs text-amber-700 mt-1">Flash sale priority</p>
          </div>

          <div
            onClick={() => {
              setStatusFilter('WARNING');
              fetchLots();
            }}
            className={`rounded-2xl border p-4 shadow-sm cursor-pointer transition ${
              statusFilter === 'WARNING'
                ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-300'
                : 'border-slate-200 bg-white hover:border-yellow-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-yellow-800">Warning (≤30d)</span>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-yellow-700">{summary.warningCount}</p>
            <p className="text-xs text-yellow-600 mt-1">Front-of-shelf</p>
          </div>

          <div
            onClick={() => {
              setStatusFilter('GOOD');
              fetchLots();
            }}
            className={`rounded-2xl border p-4 shadow-sm cursor-pointer transition ${
              statusFilter === 'GOOD'
                ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300'
                : 'border-slate-200 bg-white hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800">Fresh / Good</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.goodCount}</p>
            <p className="text-xs text-emerald-600 mt-1">&gt; 30 days buffer</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-center items-center text-center">
            <span className="text-xs font-medium text-slate-500">POS Integration</span>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              <PackageCheck className="h-3 w-3" /> FEFO Active
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Auto-dispatches oldest lot</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1">
            {['ALL', 'CRITICAL', 'WARNING', 'EXPIRED', 'GOOD'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL' ? 'All Lots' : st === 'CRITICAL' ? 'Critical (≤7d)' : st === 'WARNING' ? 'Warning (≤30d)' : st}
              </button>
            ))}
          </div>

          {/* Search and Location filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search batch, product, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLots()}
                className="w-56 sm:w-64 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.type})
                </option>
              ))}
            </select>

            <button
              onClick={() => fetchLots()}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 border border-slate-200"
              title="Refresh lots"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Lots Data Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Product & SKU</th>
                  <th scope="col" className="px-4 py-3.5">Batch Code</th>
                  <th scope="col" className="px-4 py-3.5">Location</th>
                  <th scope="col" className="px-4 py-3.5 text-right">On-Hand Qty</th>
                  <th scope="col" className="px-4 py-3.5">Expiry Date</th>
                  <th scope="col" className="px-4 py-3.5">Expiry Status</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Received Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {lots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{lot.productName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {lot.productSku || 'No SKU'}
                        {lot.variantName ? ` · ${lot.variantName}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800 border border-slate-200">
                        {lot.batchCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>{lot.locationName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {lot.qtyOnHand.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {lot.expiryDate ? (
                        <span className="font-medium text-slate-800">
                          {new Date(lot.expiryDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(lot)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 text-[11px]">
                      {lot.receivedAt
                        ? new Date(lot.receivedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}

                {lots.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <Apple className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-600">No stock lots found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Receive a batch or adjust filter criteria above.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal: Receive Batch (FEFO) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Receive Inventory Batch (FEFO Lot)"
      >
        <form onSubmit={handleReceiveSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Product *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const p = productsList.find((prod) => prod.id === e.target.value);
                if (p?.costPrice) setUnitCost(String(p.costPrice));
              }}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku || 'No SKU'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batch Code *
              </label>
              <input
                type="text"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                required
                placeholder="e.g. LOT-2026-001"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiration Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity Received (Units) *
              </label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit Cost (LKR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Destination Location *
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.type})
                </option>
              ))}
            </select>
          </div>

          {formMsg && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold ${
                formMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {formMsg.text}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? 'Receiving...' : 'Confirm Receipt'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
