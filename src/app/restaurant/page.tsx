'use client';

import React, { useState } from 'react';
import { UtensilsCrossed, Plus, Printer, CheckCircle2, Clock, Users, Coffee, ShoppingBag, X } from 'lucide-react';

interface DiningTable {
  id: string;
  name: string;
  capacity: number;
  status: 'VACANT' | 'SEATED' | 'ORDERED' | 'SERVED';
  activeOrder?: {
    kotNumber: string;
    items: Array<{ name: string; qty: number; notes?: string; price: number }>;
    total: number;
    waiter: string;
    seatedTime: string;
  };
}

export default function RestaurantFloorPage() {
  const [tables, setTables] = useState<DiningTable[]>([
    {
      id: 't1',
      name: 'Table 01 (Window)',
      capacity: 4,
      status: 'ORDERED',
      activeOrder: {
        kotNumber: 'KOT-204',
        items: [
          { name: 'Kottu Roti (Chicken Special)', qty: 2, notes: 'Extra Spicy, No Leeks', price: 1800.0 },
          { name: 'Iced Milo Dinosaur', qty: 2, price: 650.0 },
        ],
        total: 4900.0,
        waiter: 'Saman',
        seatedTime: '15 mins ago',
      },
    },
    {
      id: 't2',
      name: 'Table 02 (Center)',
      capacity: 2,
      status: 'SERVED',
      activeOrder: {
        kotNumber: 'KOT-202',
        items: [
          { name: 'Egg Hoppers (Set of 4)', qty: 1, notes: 'Crispy edges', price: 950.0 },
          { name: 'Ceylon Ginger Tea', qty: 2, price: 400.0 },
        ],
        total: 1750.0,
        waiter: 'Amal',
        seatedTime: '35 mins ago',
      },
    },
    { id: 't3', name: 'Table 03 (Booth)', capacity: 6, status: 'VACANT' },
    { id: 't4', name: 'Table 04 (Booth)', capacity: 6, status: 'VACANT' },
    { id: 't5', name: 'VIP Lounge Dining', capacity: 10, status: 'VACANT' },
    { id: 't6', name: 'Takeaway Counter #1', capacity: 1, status: 'VACANT' },
  ]);

  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(tables[0]);

  const handleTableStatusChange = (tableId: string, newStatus: DiningTable['status']) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          const updated = {
            ...t,
            status: newStatus,
            activeOrder: newStatus === 'VACANT' ? undefined : t.activeOrder,
          };
          if (selectedTable?.id === tableId) setSelectedTable(updated);
          return updated;
        }
        return t;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Restaurant Floor & Kitchen Display (KDS)</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">
              Food & Beverage Vertical
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dine-in table management, Kitchen Order Tickets (KOT), item modifiers, and split table billing.
          </p>
        </div>
      </div>

      {/* Main Floor Grid vs Table Order Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Floor Layout Grid */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Dining Area Floor Plan</h3>
            <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Vacant</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Kitchen Order</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Served</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tables.map((table) => {
              const isSelected = selectedTable?.id === table.id;
              return (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between aspect-[4/3] transition-all hover:shadow-md ${
                    isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border/80 bg-secondary/40'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-xs text-foreground">{table.name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Users className="h-3 w-3" /> {table.capacity} Seats
                      </p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      table.status === 'VACANT'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : table.status === 'ORDERED'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      {table.status}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border/40">
                    {table.activeOrder ? (
                      <div>
                        <p className="font-mono text-xs font-bold text-foreground">LKR {table.activeOrder.total.toFixed(2)}</p>
                        <p className="text-[9px] text-muted-foreground">{table.activeOrder.items.length} items &bull; {table.activeOrder.seatedTime}</p>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Ready for seating</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Active Table Order & KOT Actions */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4 text-xs">
          {selectedTable ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <div>
                  <h3 className="font-bold text-sm text-foreground">{selectedTable.name}</h3>
                  <p className="text-[10px] text-muted-foreground">Capacity: {selectedTable.capacity} Guests</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  selectedTable.status === 'VACANT' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {selectedTable.status}
                </span>
              </div>

              {selectedTable.activeOrder ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Active KOT: <strong className="text-foreground">{selectedTable.activeOrder.kotNumber}</strong></span>
                    <span>Waiter: {selectedTable.activeOrder.waiter}</span>
                  </div>

                  {/* KOT Items */}
                  <div className="space-y-2 py-2 border-y border-border/50 max-h-48 overflow-y-auto">
                    {selectedTable.activeOrder.items.map((item, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-secondary/60 space-y-0.5">
                        <div className="flex justify-between font-semibold text-foreground">
                          <span>{item.qty}x {item.name}</span>
                          <span className="font-mono">LKR {(item.price * item.qty).toFixed(2)}</span>
                        </div>
                        {item.notes && (
                          <p className="text-[10px] text-amber-600 font-medium">★ Note: {item.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between font-bold text-sm text-foreground pt-1">
                    <span>Table Total Due:</span>
                    <span className="text-primary font-mono text-base">LKR {selectedTable.activeOrder.total.toFixed(2)}</span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => handleTableStatusChange(selectedTable.id, 'SERVED')}
                      className="w-full py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border font-semibold flex items-center justify-center gap-1.5"
                    >
                      <span>Mark All Dishes Served</span>
                    </button>
                    <button
                      onClick={() => handleTableStatusChange(selectedTable.id, 'VACANT')}
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md flex items-center justify-center gap-2"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print Customer Bill & Settle</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground space-y-3">
                  <UtensilsCrossed className="h-8 w-8 mx-auto opacity-40" />
                  <p>Table is currently vacant.</p>
                  <button
                    onClick={() =>
                      handleTableStatusChange(selectedTable.id, 'ORDERED')
                    }
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold"
                  >
                    Seat Guests & Create KOT
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Select a table to manage</p>
          )}
        </div>
      </div>
    </div>
  );
}
