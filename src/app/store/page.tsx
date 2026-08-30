'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Palette,
  X,
  Plus,
  Minus,
  MessageCircle,
  Tag,
  Star,
} from 'lucide-react';

interface StoreProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  imageBg: string;
  inStock: boolean;
  stockCount: number;
  badge?: string;
  rating: number;
}

const PRODUCTS: StoreProduct[] = [
  { id: '1', name: 'Linen Casual Shirt (Blue)', category: 'Apparel', price: 4500.0, imageBg: 'from-blue-600 to-indigo-800', inStock: true, stockCount: 31, badge: 'Best Seller', rating: 4.9 },
  { id: '2', name: 'Oxford Button-Down (White)', category: 'Apparel', price: 5200.0, imageBg: 'from-slate-700 to-slate-900', inStock: true, stockCount: 18, badge: 'Popular', rating: 4.8 },
  { id: '3', name: 'Stretch Chino Trousers (Khaki)', category: 'Bottoms', price: 6500.0, imageBg: 'from-amber-700 to-amber-900', inStock: true, stockCount: 24, badge: 'Trending', rating: 4.7 },
  { id: '4', name: 'Pique Cotton Polo (Navy)', category: 'Apparel', price: 3800.0, imageBg: 'from-indigo-800 to-slate-900', inStock: true, stockCount: 12, rating: 4.6 },
];

type ThemeMode = 'MIDNIGHT' | 'MINIMAL' | 'EMERALD' | 'SUNSET';

export default function StorefrontPage() {
  const [theme, setTheme] = useState<ThemeMode>('MIDNIGHT');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');

  // Cart State
  const [cart, setCart] = useState<{ product: StoreProduct; quantity: number }[]>([
    { product: PRODUCTS[0], quantity: 1 },
  ]);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');

  const addToCart = (product: StoreProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsBagOpen(true);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'SUMMER10') {
      setDiscountPct(10);
      setCouponMsg('10% Summer Discount Applied! ✓');
    } else if (couponCode.toUpperCase() === 'VIP20') {
      setDiscountPct(20);
      setCouponMsg('20% VIP Coupon Applied! ✓');
    } else {
      setDiscountPct(0);
      setCouponMsg('Invalid coupon code');
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = (subtotal * discountPct) / 100;
  const netTotal = subtotal - discountAmount;

  const totalBagItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Dynamic Theme Styling Classes
  const getThemeClasses = () => {
    switch (theme) {
      case 'MINIMAL':
        return {
          wrapper: 'bg-white text-slate-900',
          card: 'bg-slate-50 border-slate-200 text-slate-900',
          accent: 'bg-black text-white hover:bg-slate-800',
          accentText: 'text-black',
          bannerBg: 'bg-slate-100 border-slate-200 text-slate-900',
          badge: 'bg-black text-white',
        };
      case 'EMERALD':
        return {
          wrapper: 'bg-emerald-950 text-emerald-50',
          card: 'bg-emerald-900/40 border-emerald-800/60 text-emerald-100',
          accent: 'bg-emerald-500 text-black hover:bg-emerald-400 font-bold',
          accentText: 'text-emerald-400',
          bannerBg: 'bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 border-emerald-800',
          badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
        };
      case 'SUNSET':
        return {
          wrapper: 'bg-slate-950 text-orange-50',
          card: 'bg-slate-900/80 border-orange-500/30 text-orange-100',
          accent: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-600 hover:to-rose-600 font-bold',
          accentText: 'text-orange-400',
          bannerBg: 'bg-gradient-to-r from-orange-950/80 via-rose-950/80 to-slate-950 border-orange-500/40',
          badge: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
        };
      case 'MIDNIGHT':
      default:
        return {
          wrapper: 'bg-card text-foreground',
          card: 'bg-card border-border/80 text-foreground',
          accent: 'bg-primary text-primary-foreground hover:bg-primary/90 font-bold',
          accentText: 'text-primary',
          bannerBg: 'bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 border-blue-500/30',
          badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
        };
    }
  };

  const themeStyles = getThemeClasses();

  return (
    <div className={`min-h-screen space-y-6 -m-4 sm:-m-6 p-4 sm:p-6 transition-colors duration-300 ${themeStyles.wrapper}`}>
      {/* 1. Theme Switcher Bar */}
      <div className="p-3 rounded-2xl bg-secondary/50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <span className="font-bold">Live Storefront Theme Switcher:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'MIDNIGHT', label: 'Midnight Luxury' },
            { id: 'MINIMAL', label: 'Minimalist Chic' },
            { id: 'EMERALD', label: 'Emerald Organic' },
            { id: 'SUNSET', label: 'Sunset Vibrant' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as ThemeMode)}
              className={`px-3 py-1 rounded-xl font-semibold transition-all ${
                theme === t.id
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'bg-secondary hover:bg-secondary/80 border border-border'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/store/builder"
            className="px-3 py-1 rounded-xl bg-card border border-border text-foreground hover:border-primary font-semibold flex items-center gap-1 transition-all"
          >
            <span>Customizer</span>
          </Link>
          <button
            onClick={() => setIsBagOpen(true)}
            className="px-3.5 py-1 rounded-xl bg-primary text-primary-foreground font-bold flex items-center gap-1.5 shadow-sm"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Bag ({totalBagItems})</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Banner */}
      <div className={`p-8 rounded-3xl border shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 ${themeStyles.bannerBg}`}>
        <div className="space-y-3 max-w-xl text-center md:text-left z-10">
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider inline-block ${themeStyles.badge}`}>
            ✨ Spring / Summer 2026 Collection
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Premium Handcrafted Linen & Apparel
          </h1>
          <p className="text-xs opacity-80 leading-relaxed">
            Directly from our Colombo flagship boutique. Order online with instant 24h Islandwide delivery or Cash on Delivery.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <a
              href="#catalog"
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 ${themeStyles.accent}`}
            >
              Shop Collection
            </a>
            <a
              href="https://wa.me/94771234567?text=Hi%2C+I+want+to+browse+your+latest+products"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Order on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Hero Graphic Card */}
        <div className="relative z-10 hidden md:block">
          <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white space-y-2 text-xs shadow-2xl">
            <p className="text-[10px] opacity-70">Flash Promotion</p>
            <p className="font-bold text-lg">Use Code: <span className="font-mono text-amber-400">SUMMER10</span></p>
            <p className="text-[11px] opacity-80">Get 10% Off on orders above LKR 4,000</p>
          </div>
        </div>
      </div>

      {/* 3. Trust Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className={`p-3.5 rounded-2xl border flex items-center gap-2.5 ${themeStyles.card}`}>
          <Truck className={`h-5 w-5 ${themeStyles.accentText}`} />
          <div>
            <p className="font-bold">24h Express Delivery</p>
            <p className="text-[10px] opacity-70">Islandwide in Sri Lanka</p>
          </div>
        </div>
        <div className={`p-3.5 rounded-2xl border flex items-center gap-2.5 ${themeStyles.card}`}>
          <ShieldCheck className={`h-5 w-5 ${themeStyles.accentText}`} />
          <div>
            <p className="font-bold">100% Authentic</p>
            <p className="text-[10px] opacity-70">Directly from Brand Store</p>
          </div>
        </div>
        <div className={`p-3.5 rounded-2xl border flex items-center gap-2.5 ${themeStyles.card}`}>
          <RotateCcw className={`h-5 w-5 ${themeStyles.accentText}`} />
          <div>
            <p className="font-bold">7-Day Free Exchange</p>
            <p className="text-[10px] opacity-70">Hassle-free return policy</p>
          </div>
        </div>
        <div className={`p-3.5 rounded-2xl border flex items-center gap-2.5 ${themeStyles.card}`}>
          <MessageCircle className={`h-5 w-5 ${themeStyles.accentText}`} />
          <div>
            <p className="font-bold">Instant WhatsApp Support</p>
            <p className="text-[10px] opacity-70">+94 77 123 4567</p>
          </div>
        </div>
      </div>

      {/* 4. Catalog Filters & Search */}
      <div id="catalog" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          {['ALL', 'Apparel', 'Bottoms'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl border transition-all ${
                selectedCategory === cat
                  ? themeStyles.accent
                  : 'border-border/60 hover:bg-secondary/60 opacity-80'
              }`}
            >
              {cat === 'ALL' ? 'All Products' : cat}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full text-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 opacity-50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search catalog..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary/60 border border-border/80 focus:outline-none"
          />
        </div>
      </div>

      {/* 5. Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PRODUCTS.filter(
          (p) =>
            (selectedCategory === 'ALL' || p.category === selectedCategory) &&
            p.name.toLowerCase().includes(search.toLowerCase())
        ).map((product) => (
          <div
            key={product.id}
            className={`p-4 rounded-3xl border shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all duration-300 ${themeStyles.card}`}
          >
            <div>
              {/* Product Visual Box */}
              <div className={`h-48 rounded-2xl bg-gradient-to-tr ${product.imageBg} relative overflow-hidden flex items-center justify-center text-white shadow-inner mb-3`}>
                <span className="text-4xl font-extrabold opacity-30 select-none">GRABBER</span>
                {product.badge && (
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-white/10">
                    {product.badge}
                  </span>
                )}
                <span className="absolute bottom-2.5 right-2.5 text-[10px] px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-emerald-400 font-medium">
                  {product.stockCount} in stock
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-amber-400">
                  <Star className="h-3 w-3 fill-amber-400" />
                  <span className="font-bold">{product.rating}</span>
                  <span className="opacity-50">(48 reviews)</span>
                </div>
                <h3 className="font-bold text-sm leading-snug">{product.name}</h3>
                <p className="text-[11px] opacity-70">{product.category}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] opacity-60 block">Price</span>
                <span className="font-extrabold text-base">LKR {product.price.toFixed(2)}</span>
              </div>

              <button
                onClick={() => addToCart(product)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 ${themeStyles.accent}`}
              >
                Add to Bag
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 6. Shopping Bag Drawer Modal */}
      {isBagOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-card border-l border-border w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between text-xs animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-base text-foreground">Your Shopping Bag ({totalBagItems})</h3>
                </div>
                <button onClick={() => setIsBagOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="py-4 space-y-3 max-h-[50vh] overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Your bag is empty.</p>
                ) : (
                  cart.map(({ product, quantity }) => (
                    <div key={product.id} className="p-3 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-between">
                      <div className="flex-1 pr-2">
                        <p className="font-bold text-foreground">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground">LKR {product.price.toFixed(2)} each</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-card rounded-lg border border-border p-0.5">
                          <button onClick={() => updateQty(product.id, -1)} className="h-5 w-5 rounded flex items-center justify-center">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center font-bold">{quantity}</span>
                          <button onClick={() => updateQty(product.id, 1)} className="h-5 w-5 rounded flex items-center justify-center">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="font-bold w-16 text-right font-mono">
                          LKR {(product.price * quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bag Summary & Checkout */}
            <div className="pt-4 border-t border-border space-y-3">
              {/* Coupon input */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code (e.g. SUMMER10)"
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border text-foreground uppercase font-mono font-bold"
                />
                <button type="submit" className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border font-bold">
                  Apply
                </button>
              </form>
              {couponMsg && (
                <p className={`text-[10px] font-bold ${discountPct > 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {couponMsg}
                </p>
              )}

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>LKR {subtotal.toFixed(2)}</span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount ({discountPct}%)</span>
                    <span>- LKR {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-foreground pt-2 border-t border-border">
                  <span>Total Amount</span>
                  <span className="text-primary">LKR {netTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={`https://wa.me/94771234567?text=Hi%2C+I+want+to+order%3A+%0A${encodeURIComponent(
                    cart.map((i) => `${i.quantity}x ${i.product.name} (LKR ${(i.product.price * i.quantity).toFixed(2)})`).join('%0A')
                  )}%0ATotal%3A+LKR+${netTotal.toFixed(2)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Instant Checkout on WhatsApp</span>
                </a>
                <button
                  onClick={() => {
                    alert('Order placed successfully via Cash on Delivery!');
                    setCart([]);
                    setIsBagOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:bg-primary/90"
                >
                  Place Order (Cash on Delivery / Card)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
