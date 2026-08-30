'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Store, ShoppingBag, MapPin, CheckCircle2, ShieldCheck, Truck, MessageCircle, X, Plus, Minus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  variant: string;
  sku: string;
  stock: number;
  availableBranch: string;
}

export default function StorefrontPage() {
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const products: Product[] = [
    { id: 'p1', name: 'Linen Casual Shirt', price: 4500, variant: 'Size L / Blue', sku: 'LNN-SHT-BLU-L', stock: 31, availableBranch: 'Colombo Main Branch' },
    { id: 'p2', name: 'Oxford Button-Down', price: 5200, variant: 'Size M / White', sku: 'OXF-SHT-WHT-M', stock: 18, availableBranch: 'Colombo Main Branch' },
    { id: 'p3', name: 'Stretch Chino Trousers', price: 6500, variant: '32 / Khaki', sku: 'STC-CHN-KHK-32', stock: 24, availableBranch: 'Colombo Main Branch' },
    { id: 'p4', name: 'Pique Cotton Polo', price: 3800, variant: 'Size XL / Navy', sku: 'PIQ-POL-NVY-XL', stock: 12, availableBranch: 'Colombo Main Branch' },
  ];

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const grandTotal = subtotal + tax;

  const addToBag = (product: Product) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.product.id === product.id);
      if (exists) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsBagOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: Product; quantity: number }>
    );
  };

  const handleOrderWhatsApp = (product?: Product) => {
    const text = product
      ? encodeURIComponent(`Hi Grabber! I would like to order "${product.name}" (${product.variant}) for LKR ${product.price}. Is COD available to my area?`)
      : encodeURIComponent(`Hi Grabber! I would like to place an order from my bag. Total: LKR ${grandTotal.toFixed(2)}. Please confirm delivery.`);
    window.open(`https://wa.me/94771234567?text=${text}`, '_blank');
  };

  // SEO JSON-LD Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: 'Grabber Flagship Retail Store',
    description: 'Official online store for Grabber premium menswear in Sri Lanka.',
    currenciesAccepted: 'LKR',
    paymentAccepted: 'Cash, Credit Card, PayHere, COD',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Galle Road',
      addressLocality: 'Colombo',
      postalCode: '00300',
      addressCountry: 'LK',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Men Essentials',
      itemListElement: products.map((p) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Product',
          name: p.name,
          sku: p.sku,
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: 'LKR',
            availability: 'https://schema.org/InStock',
          },
        },
      })),
    },
  };

  return (
    <div className="space-y-6">
      {/* Inject SEO JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top Announcement */}
      <div className="py-1.5 px-4 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-center text-xs font-semibold flex items-center justify-between">
        <span>🚚 Free Islandwide Delivery on Orders Over LKR 10,000!</span>
        <Link href="/store/builder" className="hover:underline text-[11px] font-normal">
          Customize Storefront &rarr;
        </Link>
      </div>

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
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
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
          <button
            onClick={() => setIsBagOpen(true)}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-all"
          >
            <ShoppingBag className="h-4 w-4 text-primary" />
            <span>Bag ({totalItems})</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between hover:border-primary/50 transition-all">
              <div className="space-y-2">
                <div className="h-40 rounded-xl bg-secondary/70 flex items-center justify-center text-muted-foreground font-medium text-xs">
                  {p.name} Photo
                </div>
                <h4 className="font-bold text-xs text-foreground mt-2">{p.name}</h4>
                <p className="text-[11px] text-muted-foreground">{p.variant}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <MapPin className="h-3 w-3" />
                  <span>{p.availableBranch} ({p.stock} in stock)</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">LKR {p.price.toLocaleString()}</span>
                  <button
                    onClick={() => addToBag(p)}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all active:scale-95 shadow-sm shadow-primary/20"
                  >
                    Add to Bag
                  </button>
                </div>

                <button
                  onClick={() => handleOrderWhatsApp(p)}
                  className="w-full py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Order via WhatsApp</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide-out Shopping Bag Drawer */}
      {isBagOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-card border-l border-border w-full max-w-md h-full flex flex-col p-6 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <span>Your Shopping Bag ({totalItems})</span>
              </h3>
              <button onClick={() => setIsBagOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
                  <ShoppingBag className="h-10 w-10 mb-2 opacity-30" />
                  <p>Your bag is currently empty.</p>
                </div>
              ) : (
                cart.map(({ product, quantity }) => (
                  <div key={product.id} className="p-3 rounded-xl bg-secondary/50 border border-border/40 flex items-center justify-between text-xs">
                    <div className="flex-1 pr-2">
                      <p className="font-semibold text-foreground">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground">{product.variant} &bull; LKR {product.price.toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-card rounded-lg border border-border p-0.5">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center font-bold">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-bold text-foreground w-16 text-right">
                        LKR {(product.price * quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart footer */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-border space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>LKR {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT (18%)</span>
                  <span>LKR {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border/50">
                  <span>Grand Total</span>
                  <span className="text-primary text-base">LKR {grandTotal.toFixed(2)}</span>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => {
                      setCheckoutSuccess(true);
                      setCart([]);
                    }}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
                  >
                    Proceed to Online Checkout
                  </button>

                  <button
                    onClick={() => handleOrderWhatsApp()}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Complete Order via WhatsApp</span>
                  </button>
                </div>
              </div>
            )}

            {checkoutSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-semibold text-xs flex items-center gap-2 mt-3">
                <CheckCircle2 className="h-4 w-4" />
                <span>Order Placed! Colombo Main Branch stock reserved.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
