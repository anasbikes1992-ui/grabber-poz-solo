'use client';

import React, { useState } from 'react';
import { Truck, Search, MapPin, CheckCircle2, Clock, DollarSign, Package, User } from 'lucide-react';

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  shippingAddress: string;
  courier: string;
  trackingNumber: string;
  items: string;
  codAmount: number;
  codCollected: boolean;
  status: 'PENDING_DISPATCH' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
}

export default function DeliveryBoardPage() {
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([
    {
      id: 'd1',
      orderNumber: 'WEB-2026-2001',
      customerName: 'Nimal Silva',
      phone: '+94 70 111 2233',
      shippingAddress: '23 Beach Road, Mount Lavinia',
      courier: 'Koombiyo Courier',
      trackingNumber: 'KMB-112233',
      items: '3x Linen Casual Shirt (L / Blue)',
      codAmount: 0.0, // Paid online via PayHere
      codCollected: true,
      status: 'IN_TRANSIT',
    },
    {
      id: 'd2',
      orderNumber: 'WA-2026-3001',
      customerName: 'Kamal Gunaratne',
      phone: '+94 76 555 4433',
      shippingAddress: '88 High Level Road, Nugegoda',
      courier: 'Prompt Express',
      trackingNumber: 'PRM-778899',
      items: '1x Linen Casual Shirt (L / Blue)',
      codAmount: 5310.0,
      codCollected: false,
      status: 'OUT_FOR_DELIVERY',
    },
  ]);

  const [search, setSearch] = useState('');

  const updateStatus = (id: string, newStatus: DeliveryOrder['status'], markCOD = false) => {
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: newStatus, codCollected: markCOD ? true : d.codCollected }
          : d
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Logistics & Courier Dispatch Board</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 font-semibold border border-purple-500/20">
              Live Courier Tracking
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Storefront & WhatsApp online orders dispatch, courier integration, and Cash on Delivery (COD) reconciliation.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-muted-foreground font-medium">Pending Dispatch</p>
          <h3 className="text-xl font-bold text-foreground mt-1">0 Orders</h3>
          <p className="text-[10px] text-emerald-600 font-medium">All orders assigned to couriers</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-muted-foreground font-medium">In Transit / Out</p>
          <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">2 Shipments</h3>
          <p className="text-[10px] text-muted-foreground">Koombiyo &bull; Prompt Express</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-muted-foreground font-medium">Pending COD Cash</p>
          <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">LKR 5,310.00</h3>
          <p className="text-[10px] text-muted-foreground">To be remitted by courier</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-muted-foreground font-medium">Delivery Success Rate</p>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">98.5%</h3>
          <p className="text-[10px] text-emerald-600 font-medium">Average 24.2h Islandwide</p>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Order Number</th>
                <th className="pb-2.5 font-medium">Customer & Address</th>
                <th className="pb-2.5 font-medium">Courier Partner</th>
                <th className="pb-2.5 font-medium">Ordered Items</th>
                <th className="pb-2.5 font-medium text-right">COD Due</th>
                <th className="pb-2.5 font-medium text-right">Status</th>
                <th className="pb-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {deliveries.map((d) => (
                <tr key={d.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3 font-mono font-bold text-foreground">{d.orderNumber}</td>
                  <td className="py-3">
                    <p className="font-semibold text-foreground">{d.customerName}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {d.shippingAddress}
                    </p>
                  </td>
                  <td className="py-3">
                    <p className="font-medium text-foreground">{d.courier}</p>
                    <p className="font-mono text-[10px] text-primary">{d.trackingNumber}</p>
                  </td>
                  <td className="py-3 text-muted-foreground max-w-xs">{d.items}</td>
                  <td className="py-3 text-right">
                    {d.codAmount > 0 ? (
                      <div>
                        <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                          LKR {d.codAmount.toLocaleString()}
                        </span>
                        <p className="text-[9px] text-muted-foreground">
                          {d.codCollected ? '✓ Remitted' : 'Pending'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                        PREPAID
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      d.status === 'DELIVERED'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : d.status === 'OUT_FOR_DELIVERY'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {d.status !== 'DELIVERED' && (
                      <button
                        onClick={() => updateStatus(d.id, 'DELIVERED', true)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium text-[11px] hover:bg-emerald-700 transition-colors"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
