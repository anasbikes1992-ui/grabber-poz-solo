'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, MapPin, RefreshCw, PackageCheck, ClipboardList, FileText, UserPlus, Send } from 'lucide-react';

type ShipmentRow = {
  orderId: string;
  deliveryId: string | null;
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  shippingAddress: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  courierPartner: string | null;
  trackingNumber: string | null;
  codAmount: number;
  riderId: string | null;
  riderName: string | null;
  riderPhone: string | null;
  riderWhatsappPhone: string | null;
  assignmentMode: string | null;
  riderNotificationStatus: string | null;
  status: 'PENDING_DISPATCH' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
};

type Rider = {
  id: string;
  name: string;
  phone: string | null;
  whatsappPhone: string;
  active: boolean;
  vehicleType: string | null;
  notes: string | null;
};

function mapFulfillment(status: string): ShipmentRow['status'] {
  const s = status.toUpperCase();
  if (s === 'DELIVERED') return 'DELIVERED';
  if (s === 'OUT_FOR_DELIVERY') return 'OUT_FOR_DELIVERY';
  if (s === 'IN_TRANSIT' || s === 'PICKED_UP' || s === 'ASSIGNED' || s === 'SHIPPED') return 'IN_TRANSIT';
  return 'PENDING_DISPATCH';
}

function toRow(s: Record<string, unknown>): ShipmentRow {
  const fulfillment = String(s.fulfillmentStatus || 'PENDING');
  const isCod = String(s.paymentMethod) === 'COD';
  const codDue = isCod && String(s.paymentStatus) !== 'paid' ? Number(s.total || 0) : Number(s.codAmount || 0);
  return {
    orderId: String(s.orderId),
    deliveryId: s.deliveryId ? String(s.deliveryId) : null,
    orderNumber: String(s.orderNumber),
    customerName: String(s.customerName || 'Walk-in'),
    customerMobile: String(s.customerMobile || ''),
    shippingAddress: String(s.shippingAddress || 'Address on file'),
    total: Number(s.total || 0),
    paymentMethod: String(s.paymentMethod || 'CASH'),
    paymentStatus: String(s.paymentStatus || 'pending'),
    fulfillmentStatus: fulfillment,
    courierPartner: s.courierPartner ? String(s.courierPartner) : null,
    trackingNumber: s.trackingNumber ? String(s.trackingNumber) : null,
    codAmount: codDue,
    riderId: s.riderId ? String(s.riderId) : null,
    riderName: s.riderName ? String(s.riderName) : null,
    riderPhone: s.riderPhone ? String(s.riderPhone) : null,
    riderWhatsappPhone: s.riderWhatsappPhone ? String(s.riderWhatsappPhone) : null,
    assignmentMode: s.assignmentMode ? String(s.assignmentMode) : null,
    riderNotificationStatus: s.riderNotificationStatus ? String(s.riderNotificationStatus) : null,
    status: mapFulfillment(fulfillment),
  };
}

export default function DeliveryBoardPage() {
  const [deliveries, setDeliveries] = useState<ShipmentRow[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [riderSelections, setRiderSelections] = useState<Record<string, string>>({});
  const [riderForm, setRiderForm] = useState({ name: '', whatsappPhone: '', phone: '', vehicleType: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, riderRes] = await Promise.all([
        fetch('/api/delivery'),
        fetch('/api/delivery/riders'),
      ]);
      const data = await res.json();
      const riderData = await riderRes.json();
      if (!data.success) throw new Error(data.error || 'Failed to load shipments');
      if (!riderData.success) throw new Error(riderData.error || 'Failed to load riders');
      setDeliveries((data.shipments || []).map(toRow));
      setRiders(riderData.riders || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchOrder = async (id: string, preset: string) => {
    setBusyId(id);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, preset }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const createRider = async () => {
    setBusyId('rider-create');
    try {
      const res = await fetch('/api/delivery/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(riderForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create rider');
      setRiderForm({ name: '', whatsappPhone: '', phone: '', vehicleType: '' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const disableRider = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/delivery/riders?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to disable rider');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const dispatchKoombiyo = async (row: ShipmentRow) => {
    setBusyId(row.orderId);
    try {
      const res = await fetch('/api/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: row.orderId,
          recipientName: row.customerName,
          recipientPhone: row.customerMobile,
          address: row.shippingAddress,
          paymentMethod: row.paymentMethod,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const dispatchInHouse = async (row: ShipmentRow, autoAssign = false) => {
    setBusyId(row.orderId);
    try {
      const riderId = riderSelections[row.orderId] || row.riderId || '';
      const res = await fetch('/api/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: row.orderId,
          recipientName: row.customerName,
          recipientPhone: row.customerMobile,
          address: row.shippingAddress,
          paymentMethod: row.paymentMethod,
          courierPartner: 'In-House',
          riderId: autoAssign ? undefined : riderId || undefined,
          autoAssign,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to assign in-house rider');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const pending = deliveries.filter((d) => d.status === 'PENDING_DISPATCH').length;
  const inTransit = deliveries.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'OUT_FOR_DELIVERY').length;
  const pendingCod = deliveries.reduce((sum, d) => (d.codAmount > 0 && d.paymentStatus !== 'paid' ? sum + d.codAmount : sum), 0);
  const delivered = deliveries.filter((d) => d.status === 'DELIVERED').length;
  const successRate = deliveries.length ? Math.round((delivered / deliveries.length) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-400" />
            <span>Logistics & Courier Dispatch Board</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Koombiyo dispatch + tracking via /api/delivery — fulfillment presets on /api/orders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="px-3 py-2 rounded-xl border border-zinc-800 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && <p className="text-xs text-amber-400">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl glass-card">
          <p className="text-muted-foreground font-medium">Pending Dispatch</p>
          <h3 className="text-xl font-bold text-foreground mt-1">{pending} Orders</h3>
        </div>
        <div className="p-4 rounded-2xl glass-card">
          <p className="text-muted-foreground font-medium">In Transit / Out</p>
          <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{inTransit} Shipments</h3>
        </div>
        <div className="p-4 rounded-2xl glass-card">
          <p className="text-muted-foreground font-medium">Pending COD Cash</p>
          <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            LKR {pendingCod.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
        </div>
        <div className="p-4 rounded-2xl glass-card">
          <p className="text-muted-foreground font-medium">Delivery Success Rate</p>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{successRate}%</h3>
        </div>
      </div>

      <div className="p-5 rounded-2xl glass-card space-y-4">
        <div>
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-emerald-400" /> In-house Riders
          </h3>
          <p className="text-[11px] text-muted-foreground">Add store riders and assign delivery jobs by WhatsApp.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            value={riderForm.name}
            onChange={(e) => setRiderForm({ ...riderForm, name: e.target.value })}
            placeholder="Rider name"
            className="px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs"
          />
          <input
            value={riderForm.whatsappPhone}
            onChange={(e) => setRiderForm({ ...riderForm, whatsappPhone: e.target.value })}
            placeholder="WhatsApp number"
            className="px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs"
          />
          <input
            value={riderForm.phone}
            onChange={(e) => setRiderForm({ ...riderForm, phone: e.target.value })}
            placeholder="Phone (optional)"
            className="px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs"
          />
          <input
            value={riderForm.vehicleType}
            onChange={(e) => setRiderForm({ ...riderForm, vehicleType: e.target.value })}
            placeholder="Bike / van"
            className="px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs"
          />
          <button
            type="button"
            disabled={busyId === 'rider-create' || !riderForm.name || !riderForm.whatsappPhone}
            onClick={() => void createRider()}
            className="px-3 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-black disabled:opacity-50"
          >
            Add Rider
          </button>
        </div>
        {riders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {riders.map((r) => (
              <div key={r.id} className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/40 text-xs">
                <span className="font-bold">{r.name}</span>
                <span className="text-muted-foreground"> · {r.whatsappPhone}</span>
                {r.vehicleType && <span className="text-muted-foreground"> · {r.vehicleType}</span>}
                {!r.active && <span className="ml-2 text-[10px] text-zinc-500">Disabled</span>}
                {r.active && (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void disableRider(r.id)}
                    className="ml-2 text-[10px] text-amber-300 hover:underline disabled:opacity-50"
                  >
                    Disable
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-5 rounded-2xl glass-card space-y-4">
        {loading && <p className="text-xs text-muted-foreground">Loading shipments…</p>}
        {!loading && deliveries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No storefront delivery orders yet.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-muted-foreground">
                <th className="pb-2.5 font-medium">Order</th>
                <th className="pb-2.5 font-medium">Customer & Address</th>
                <th className="pb-2.5 font-medium">Tracking</th>
                <th className="pb-2.5 font-medium">Rider</th>
                <th className="pb-2.5 font-medium text-right">COD</th>
                <th className="pb-2.5 font-medium text-right">Status</th>
                <th className="pb-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {deliveries.map((d) => (
                <tr key={d.orderId} className="hover:bg-zinc-900/60 transition-colors duration-200">
                  <td className="py-3 font-mono font-bold text-foreground">{d.orderNumber}</td>
                  <td className="py-3">
                    <p className="font-semibold text-foreground">{d.customerName}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {d.shippingAddress}
                    </p>
                    {d.customerMobile && (
                      <p className="text-[10px] text-zinc-500 font-mono">{d.customerMobile}</p>
                    )}
                  </td>
                  <td className="py-3">
                    {d.trackingNumber ? (
                      <div>
                        <p className="font-mono text-emerald-400">{d.trackingNumber}</p>
                        <p className="text-[10px] text-zinc-500">{d.courierPartner || 'Courier'}</p>
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-500">Not dispatched</span>
                    )}
                  </td>
                  <td className="py-3 min-w-[180px]">
                    {d.riderName ? (
                      <div>
                        <p className="font-semibold text-foreground">{d.riderName}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{d.riderWhatsappPhone || d.riderPhone}</p>
                        {d.riderNotificationStatus && (
                          <span
                            className={`mt-1 inline-flex text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              d.riderNotificationStatus === 'FAILED'
                                ? 'bg-red-500/10 text-red-300'
                                : d.riderNotificationStatus === 'PENDING'
                                  ? 'bg-amber-500/10 text-amber-300'
                                  : 'bg-emerald-500/10 text-emerald-300'
                            }`}
                          >
                            {d.riderNotificationStatus}
                          </span>
                        )}
                      </div>
                    ) : (
                      <select
                        value={riderSelections[d.orderId] || ''}
                        onChange={(e) => setRiderSelections({ ...riderSelections, [d.orderId]: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px]"
                      >
                        <option value="">Select rider</option>
                        {riders.filter((r) => r.active).map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {d.codAmount > 0 ? (
                      <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                        LKR {d.codAmount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                        PREPAID
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        d.status === 'DELIVERED'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : d.status === 'OUT_FOR_DELIVERY'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-blue-500/10 text-blue-600'
                      }`}
                    >
                      {d.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-right space-x-1">
                    <Link
                      href={`/api/orders/${encodeURIComponent(d.orderNumber)}/pick-list`}
                      target="_blank"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      <ClipboardList className="h-3 w-3" /> Pick
                    </Link>
                    <Link
                      href={`/api/orders/${encodeURIComponent(d.orderNumber)}/packing-slip`}
                      target="_blank"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" /> Slip
                    </Link>
                    <Link
                      href={`/api/orders/${encodeURIComponent(d.orderNumber)}/delivery-note`}
                      target="_blank"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      <Truck className="h-3 w-3" /> Note
                    </Link>
                    {!d.trackingNumber && d.status === 'PENDING_DISPATCH' && (
                      <button
                        type="button"
                        disabled={busyId === d.orderId}
                        onClick={() => void dispatchKoombiyo(d)}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 font-semibold text-[11px] disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <PackageCheck className="h-3 w-3" /> Koombiyo
                      </button>
                    )}
                    {d.status === 'PENDING_DISPATCH' && (
                      <>
                        <button
                          type="button"
                          disabled={busyId === d.orderId || (!riderSelections[d.orderId] && !d.riderId)}
                          onClick={() => void dispatchInHouse(d, false)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 font-semibold text-[11px] disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <Send className="h-3 w-3" /> In-House
                        </button>
                        <button
                          type="button"
                          disabled={busyId === d.orderId || riders.filter((r) => r.active).length === 0}
                          onClick={() => void dispatchInHouse(d, true)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 font-semibold text-[11px] disabled:opacity-50"
                        >
                          Auto Rider
                        </button>
                      </>
                    )}
                    {d.status === 'PENDING_DISPATCH' && d.trackingNumber && (
                      <button
                        type="button"
                        disabled={busyId === d.orderId}
                        onClick={() => void patchOrder(d.orderId, 'ship')}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 font-semibold text-[11px] disabled:opacity-50"
                      >
                        Ship
                      </button>
                    )}
                    {d.status !== 'DELIVERED' && (
                      <button
                        type="button"
                        disabled={busyId === d.orderId}
                        onClick={() => void patchOrder(d.orderId, 'deliver')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-semibold text-[11px] disabled:opacity-50"
                      >
                        Delivered
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-zinc-500">
        <Link href="/app" className="text-emerald-400 hover:underline">
          Merchant Hub
        </Link>{' '}
        · Set KOOMBIYO_API_KEY on Vercel for live courier create
      </p>
    </div>
  );
}
