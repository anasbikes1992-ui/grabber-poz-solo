'use client';

import React, { useState } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  BookOpen,
  CheckCircle2,
  Printer,
  X,
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  variant: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  taxRate: number;
}

const CATALOG_ITEMS = [
  { id: 'prod_1', name: 'Linen Casual Shirt', variant: 'Size L / Blue', unitPrice: 4500.0, unitCost: 2500.0, barcode: '8901234567890', stock: 31 },
  { id: 'prod_2', name: 'Oxford Button-Down', variant: 'Size M / White', unitPrice: 5200.0, unitCost: 2800.0, barcode: '8901234567891', stock: 18 },
  { id: 'prod_3', name: 'Stretch Chino Trousers', variant: '32 / Khaki', unitPrice: 6500.0, unitCost: 3400.0, barcode: '8901234567892', stock: 24 },
  { id: 'prod_4', name: 'Pique Cotton Polo', variant: 'Size XL / Navy', unitPrice: 3800.0, unitCost: 1900.0, barcode: '8901234567893', stock: 12 },
];

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([
    { id: 'prod_1', name: 'Linen Casual Shirt', variant: 'Size L / Blue', unitPrice: 4500.0, unitCost: 2500.0, quantity: 2, taxRate: 18 },
  ]);

  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTender, setSelectedTender] = useState<'CASH' | 'CARD' | 'CREDIT' | 'SPLIT'>('CASH');
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const taxTotal = Math.round(subtotal * 0.18 * 100) / 100;
  const grandTotal = subtotal + taxTotal;

  const addToCart = (item: typeof CATALOG_ITEMS[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1, taxRate: 18 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = CATALOG_ITEMS.find((i) => i.barcode === barcodeInput.trim());
    if (found) {
      addToCart(found);
      setBarcodeInput('');
    }
  };

  const handleCompleteSale = () => {
    const orderData = {
      orderNumber: `POS-${Date.now().toString().slice(-6)}`,
      items: [...cart],
      subtotal,
      taxTotal,
      grandTotal,
      tender: selectedTender,
      timestamp: new Date(),
    };
    setCompletedOrder(orderData);
    setIsPaymentModalOpen(false);
    setCart([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
      {/* Left 7 Cols: Catalog & Barcode Scanner */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        {/* Search & Scanner Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name or SKU..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-card border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <form onSubmit={handleBarcodeSubmit} className="relative w-48">
            <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-card border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>
        </div>

        {/* Product Catalog Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1">
          {CATALOG_ITEMS.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 text-left transition-all hover:shadow-md flex flex-col justify-between group active:scale-[0.98]"
            >
              <div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary font-medium text-muted-foreground">
                  Stock: {item.stock}
                </span>
                <h4 className="font-semibold text-xs text-foreground mt-2 group-hover:text-primary transition-colors">
                  {item.name}
                </h4>
                <p className="text-[11px] text-muted-foreground">{item.variant}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">LKR {item.unitPrice.toFixed(2)}</span>
                <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  +
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right 5 Cols: Cart & Checkout Summary */}
      <div className="lg:col-span-5 flex flex-col rounded-2xl bg-card border border-border shadow-sm p-4 h-full">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="font-bold text-sm text-foreground">Current Sale</h3>
            <p className="text-[11px] text-muted-foreground">Colombo Main Counter &bull; Reg-01</p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-destructive hover:underline flex items-center gap-1 font-medium"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <Barcode className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-xs">Scan an item or select from catalog</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 flex items-center justify-between text-xs"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.variant} &bull; LKR {item.unitPrice.toFixed(2)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-card rounded-lg border border-border p-0.5">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="h-5 w-5 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="h-5 w-5 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="font-bold w-16 text-right text-foreground">
                    LKR {(item.unitPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout Button */}
        <div className="pt-3 border-t border-border space-y-2 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>LKR {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>VAT (18%)</span>
            <span>LKR {taxTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border/50">
            <span>Grand Total</span>
            <span className="text-primary text-base">LKR {grandTotal.toFixed(2)}</span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full mt-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <span>Proceed to Payment</span>
            <span>&bull;</span>
            <span>LKR {grandTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* Payment Tender Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Select Payment Tender</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-center py-2 bg-secondary/50 rounded-xl border border-border/40">
              <p className="text-xs text-muted-foreground">Total Amount Due</p>
              <p className="text-2xl font-bold text-primary">LKR {grandTotal.toFixed(2)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setSelectedTender('CASH')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
                  selectedTender === 'CASH' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'
                }`}
              >
                <Banknote className="h-5 w-5" />
                <span>Cash Tender</span>
              </button>

              <button
                onClick={() => setSelectedTender('CARD')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
                  selectedTender === 'CARD' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Card Terminal</span>
              </button>

              <button
                onClick={() => setSelectedTender('CREDIT')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
                  selectedTender === 'CREDIT' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'
                }`}
              >
                <BookOpen className="h-5 w-5" />
                <span>Polim Potha (Credit)</span>
              </button>

              <button
                onClick={() => setSelectedTender('SPLIT')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
                  selectedTender === 'SPLIT' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'
                }`}
              >
                <span className="h-5 w-5 font-bold flex items-center justify-center">&frac12;</span>
                <span>Split Tender</span>
              </button>
            </div>

            <button
              onClick={handleCompleteSale}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99]"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Complete Sale & Print Receipt</span>
            </button>
          </div>
        </div>
      )}

      {/* Completed Receipt Modal */}
      {completedOrder && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-xs">
            <div className="text-center pb-3 border-b border-border space-y-1">
              <h3 className="font-bold text-sm text-foreground">GRABBER RETAIL STORE</h3>
              <p className="text-muted-foreground text-[10px]">123 Main Street, Colombo 03</p>
              <p className="text-muted-foreground text-[10px]">Tax ID: VAT-987654321</p>
              <p className="font-semibold text-foreground mt-2">Receipt: {completedOrder.orderNumber}</p>
            </div>

            <div className="space-y-1.5">
              {completedOrder.items.map((i: any) => (
                <div key={i.id} className="flex justify-between">
                  <span>{i.quantity}x {i.name}</span>
                  <span className="font-medium">LKR {(i.unitPrice * i.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border space-y-1 text-right">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>LKR {completedOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT (18%)</span>
                <span>LKR {completedOrder.taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground text-sm pt-1 border-t border-border/50">
                <span>Total Paid ({completedOrder.tender})</span>
                <span>LKR {completedOrder.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                onClick={() => setCompletedOrder(null)}
                className="flex-1 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium"
              >
                Close
              </button>
              <button
                onClick={() => setCompletedOrder(null)}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
