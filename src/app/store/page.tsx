'use client';

import React, { useState } from 'react';
import { Store, ShoppingBag, MapPin, CheckCircle2, ShieldCheck, Truck } from 'lucide-react';

export default function StorefrontPage() {
  const [cartCount, setCartCount] = useState(0);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const products = [
    { id: 1, name: 'Linen Casual Shirt', price: 4500, variant: 'Size L / Blue', availableBranch: 'Colombo Main Branch (31 in stock)' },
    { id: 2, name: 'Oxford Button-Down', price: 5200, variant: 'Size M / White', availableBranch: 'Colombo Main Branch (18 in stock)' },
    { id: 3, name: 'Stretch Chino Trousers', price: 6500, variant: '32 / Khaki', availableBranch: 'Colombo Main Branch (24 in stock)' },
    { id: 4, name: 'Pique Cotton Polo', price: 3800, variant: 'Size XL / Navy', availableBranch: 'Colombo Main Branch (12 in stock)' },
  ];

  return (
    <div className="space-y-6">
      {/* Storefront Hero */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 font-semibold">
            Official Online Store
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight">Summer Essentials Collection</h2>
          <p className="text-xs text-blue-200/80 leading-relaxed">
            Premium casual menswear crafted with 100% pure breathable fabrics. Live real-time stock routing from our Colombo Flagship Store.
          </p>
          <div className="pt-2 flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Truck className="h-4 w-4" /> Islandwide 24–48h Delivery
            </span>
            <span className="flex items-center gap-1.5 text-blue-300">
              <ShieldCheck className="h-4 w-4" /> Secure Online & COD
            </span>
          </div>
        </div>
      </div>

      {/* Product Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-foreground">Featured Products</h3>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <ShoppingBag className="h-4 w-4" />
            <span>Bag ({cartCount})</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between hover:border-primary/50 transition-all">
              <div className="space-y-2">
                <div className="h-36 rounded-xl bg-secondary/70 flex items-center justify-center text-muted-foreground font-medium text-xs">
                  {p.name} Photo
                </div>
                <h4 className="font-bold text-xs text-foreground mt-2">{p.name}</h4>
                <p className="text-[11px] text-muted-foreground">{p.variant}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <MapPin className="h-3 w-3" />
                  <span>{p.availableBranch}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">LKR {p.price.toLocaleString()}</span>
                <button
                  onClick={() => {
                    setCartCount((c) => c + 1);
                    setCheckoutSuccess(true);
                    setTimeout(() => setCheckoutSuccess(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all active:scale-95 shadow-sm shadow-primary/20"
                >
                  Add to Bag
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {checkoutSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4" />
          <span>Item added to bag! Live inventory reserved at Colombo Main Branch.</span>
        </div>
      )}
    </div>
  );
}
