'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck, Plus, CheckCircle2, PackageCheck, AlertCircle, Grid3X3 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { buildMatrixPoLines, matrixGridKey, matrixPoSummary } from '@/lib/purchasing/matrix-po';

interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  unitCost: number;
}

interface SupplierOpt {
  id: string;
  name: string;
}

interface PurchaseOrder {
  id?: string;
  poNumber: string;
  supplier: string;
  supplierId?: string;
  warehouse: string;
  items: string;
  productSku: string;
  productId?: string;
  quantity: number;
  unitCost: number;
  total: number;
  status: string;
  date: string;
}

export default function PurchasingPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [receiveQty, setReceiveQty] = useState(50);
  const [grnStatus, setGrnStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [grnError, setGrnError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [poSupplierId, setPoSupplierId] = useState('');
  const [poProductId, setPoProductId] = useState('');
  const [poQty, setPoQty] = useState(50);
  const [poUnitCost, setPoUnitCost] = useState(2800);

  const [mxSupplierId, setMxSupplierId] = useState('');
  const [mxProductId, setMxProductId] = useState('');
  const [mxUnitCost, setMxUnitCost] = useState(2800);
  const [mxSizes, setMxSizes] = useState('S,M,L,XL,XXL');
  const [mxColors, setMxColors] = useState('Black,White,Navy,Red');
  const [mxGrid, setMxGrid] = useState<Record<string, number>>({});

  const mxSizeList = useMemo(
    () => mxSizes.split(',').map((s) => s.trim()).filter(Boolean),
    [mxSizes],
  );
  const mxColorList = useMemo(
    () => mxColors.split(',').map((c) => c.trim()).filter(Boolean),
    [mxColors],
  );
  const mxPreview = useMemo(
    () => matrixPoSummary(buildMatrixPoLines(mxSizeList, mxColorList, mxGrid, mxUnitCost)),
    [mxSizeList, mxColorList, mxGrid, mxUnitCost],
  );

  const load = useCallback(async () => {
    try {
      const [poRes, catRes, supRes] = await Promise.all([
        fetch('/api/purchasing/orders'),
        fetch('/api/pos/catalog'),
        fetch('/api/suppliers'),
      ]);
      const poData = await poRes.json();
      const catData = await catRes.json();
      const supData = await supRes.json();
      if (poData.success) {
        setPurchaseOrders(
          (poData.purchaseOrders || []).map((p: PurchaseOrder & { date?: string }) => ({
            ...p,
            date: p.date ? new Date(p.date).toLocaleDateString() : '—',
            status: p.status,
          }))
        );
      }
      if (catData.success && catData.items?.length) {
        setCatalog(
          catData.items.map((i: { id: string; name: string; sku: string; unitCost: number }) => ({
            id: i.id,
            name: i.name,
            sku: i.sku,
            unitCost: Number(i.unitCost),
          }))
        );
      }
      if (supData.success) {
        setSuppliers((supData.suppliers || []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openGrnModal = (po: PurchaseOrder) => {
    setSelectedPo(po);
    setReceiveQty(po.quantity || 1);
    setGrnStatus('IDLE');
    setGrnError(null);
    setIsGrnModalOpen(true);
  };

  const handleReceiveGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo || isSubmitting) return;
    const productId = selectedPo.productId || catalog.find((p) => p.sku === selectedPo.productSku)?.id;
    if (!productId) {
      setGrnStatus('ERROR');
      setGrnError('Product not found — seed catalog or set product on PO.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/purchasing/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poIdOrNumber: selectedPo.poNumber,
          items: [{ productId, quantity: Number(receiveQty), unitCost: selectedPo.unitCost }],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'GRN failed');
      setGrnStatus('SUCCESS');
      await load();
      setTimeout(() => setIsGrnModalOpen(false), 800);
    } catch (err) {
      setGrnStatus('ERROR');
      setGrnError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMatrixPo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mxSupplierId || !mxProductId || mxPreview.lineCount === 0) {
      setError('Select supplier, product, and enter at least one grid qty');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/purchasing/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: mxSupplierId,
          productId: mxProductId,
          sizes: mxSizeList,
          colors: mxColorList,
          grid: mxGrid,
          unitCost: mxUnitCost,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Matrix PO failed');
      setIsMatrixModalOpen(false);
      setMxGrid({});
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId || !poProductId) {
      setError('Select supplier and product');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/purchasing/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: poSupplierId,
          status: 'APPROVED',
          items: [{ productId: poProductId, quantity: Number(poQty), unitCost: Number(poUnitCost) }],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'PO create failed');
      setIsPOModalOpen(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-400" /> Purchasing & GRN
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Durable POs via /api/purchasing/orders</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setPoSupplierId(suppliers[0]?.id || '');
              setPoProductId(catalog[0]?.id || '');
              setPoUnitCost(catalog[0]?.unitCost || 0);
              setIsPOModalOpen(true);
            }}
            className="px-4 py-2 min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" /> New PO
          </button>
          <button
            type="button"
            onClick={() => {
              setMxSupplierId(suppliers[0]?.id || '');
              setMxProductId(catalog[0]?.id || '');
              setMxUnitCost(catalog[0]?.unitCost || 0);
              setIsMatrixModalOpen(true);
            }}
            className="px-4 py-2 min-h-11 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-bold flex items-center gap-2"
          >
            <Grid3X3 className="h-3.5 w-3.5" /> Matrix PO
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2.5">PO #</th>
              <th className="pb-2.5">Supplier</th>
              <th className="pb-2.5">Items</th>
              <th className="pb-2.5 text-right">Total</th>
              <th className="pb-2.5 text-right">Status</th>
              <th className="pb-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {purchaseOrders.map((po) => (
              <tr key={po.poNumber}>
                <td className="py-3 font-mono font-bold">{po.poNumber}</td>
                <td className="py-3">{po.supplier}</td>
                <td className="py-3 text-muted-foreground">{po.items}</td>
                <td className="py-3 text-right font-mono">{Number(po.total).toLocaleString()}</td>
                <td className="py-3 text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800">{po.status}</span>
                </td>
                <td className="py-3 text-right">
                  {(po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') && (
                    <button type="button" onClick={() => openGrnModal(po)} className="text-emerald-400 text-[11px] font-bold inline-flex items-center gap-1">
                      <PackageCheck className="h-3.5 w-3.5" /> Receive GRN
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!purchaseOrders.length && (
          <p className="text-xs text-muted-foreground py-4">No POs — seed or create one.</p>
        )}
      </div>

      <Modal isOpen={isPOModalOpen} onClose={() => setIsPOModalOpen(false)} title="New purchase order" as="form" onSubmit={handleCreatePo}>
        <div className="space-y-3">
          <div>
            <label htmlFor="po-sup" className="text-xs font-semibold block mb-1">Supplier</label>
            <select id="po-sup" required value={poSupplierId} onChange={(e) => setPoSupplierId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm">
              <option value="">Select…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="po-prod" className="text-xs font-semibold block mb-1">Product</label>
            <select
              id="po-prod"
              required
              value={poProductId}
              onChange={(e) => {
                setPoProductId(e.target.value);
                const p = catalog.find((c) => c.id === e.target.value);
                if (p) setPoUnitCost(p.unitCost);
              }}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm"
            >
              <option value="">Select…</option>
              {catalog.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="po-qty" className="text-xs font-semibold block mb-1">Qty</label>
              <input id="po-qty" type="number" min={1} value={poQty} onChange={(e) => setPoQty(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
            </div>
            <div>
              <label htmlFor="po-cost" className="text-xs font-semibold block mb-1">Unit cost</label>
              <input id="po-cost" type="number" value={poUnitCost} onChange={(e) => setPoUnitCost(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono" />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50">
            Create APPROVED PO
          </button>
        </div>
      </Modal>

      <Modal isOpen={isMatrixModalOpen} onClose={() => setIsMatrixModalOpen(false)} title="Matrix PO — sizes × colors" as="form" onSubmit={handleCreateMatrixPo}>
        <div className="space-y-3">
          <div>
            <label htmlFor="mx-sup" className="text-xs font-semibold block mb-1">Supplier</label>
            <select id="mx-sup" required value={mxSupplierId} onChange={(e) => setMxSupplierId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm">
              <option value="">Select…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mx-prod" className="text-xs font-semibold block mb-1">Base product (variants by Size/Color attrs)</label>
            <select
              id="mx-prod"
              required
              value={mxProductId}
              onChange={(e) => {
                setMxProductId(e.target.value);
                const p = catalog.find((c) => c.id === e.target.value);
                if (p) setMxUnitCost(p.unitCost);
              }}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm"
            >
              <option value="">Select…</option>
              {catalog.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="mx-sizes" className="text-xs font-semibold block mb-1">Sizes (comma-separated)</label>
              <input id="mx-sizes" value={mxSizes} onChange={(e) => setMxSizes(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
            </div>
            <div>
              <label htmlFor="mx-colors" className="text-xs font-semibold block mb-1">Colors (comma-separated)</label>
              <input id="mx-colors" value={mxColors} onChange={(e) => setMxColors(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
            </div>
          </div>
          <div>
            <label htmlFor="mx-cost" className="text-xs font-semibold block mb-1">Unit cost (all cells)</label>
            <input id="mx-cost" type="number" value={mxUnitCost} onChange={(e) => setMxUnitCost(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono" />
          </div>
          {mxSizeList.length > 0 && mxColorList.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="p-2 text-left text-muted-foreground">Size ↓ / Color →</th>
                    {mxColorList.map((color) => (
                      <th key={color} className="p-2 text-center font-medium">{color}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mxSizeList.map((size) => (
                    <tr key={size} className="border-b border-zinc-900">
                      <td className="p-2 font-medium">{size}</td>
                      {mxColorList.map((color) => {
                        const key = matrixGridKey(size, color);
                        return (
                          <td key={key} className="p-1">
                            <input
                              type="number"
                              min={0}
                              aria-label={`${size} ${color} qty`}
                              value={mxGrid[key] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value === '' ? 0 : Number(e.target.value);
                                setMxGrid((prev) => ({ ...prev, [key]: v }));
                              }}
                              className="w-14 px-1 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-center font-mono"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            {mxPreview.lineCount} lines · {mxPreview.totalQty} units · LKR {mxPreview.totalCost.toLocaleString()}
          </p>
          <button type="submit" disabled={isSubmitting || mxPreview.lineCount === 0} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50">
            Create matrix PO
          </button>
        </div>
      </Modal>

      <Modal isOpen={isGrnModalOpen} onClose={() => !isSubmitting && setIsGrnModalOpen(false)} title="Receive GRN" as="form" onSubmit={handleReceiveGrn}>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{selectedPo?.poNumber} · {selectedPo?.items}</p>
          <div>
            <label htmlFor="grn-qty" className="text-xs font-semibold block mb-1">Receive qty</label>
            <input id="grn-qty" type="number" min={1} value={receiveQty} onChange={(e) => setReceiveQty(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          {grnStatus === 'SUCCESS' && (
            <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Received</p>
          )}
          {grnStatus === 'ERROR' && <p className="text-xs text-destructive">{grnError}</p>}
          {grnStatus !== 'SUCCESS' && (
            <button type="submit" disabled={isSubmitting} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50">
              Confirm receive
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
