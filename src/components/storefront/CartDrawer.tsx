'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  Tag,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import type { CartEvaluationInput } from '@/lib/commerce/promotions/types';

export interface CartDrawerItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode: string | null;
  unitPrice: number;
  stock: number;
  qty: number;
  variant?: string;
  taxRate?: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartDrawerItem[];
  onUpdateQty: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart?: () => void;
  whatsappPhone?: string;
}

function money(n: number) {
  return `LKR ${n.toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQty,
  onRemoveItem,
  whatsappPhone,
}: CartDrawerProps) {
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.qty, 0);
  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
  const discountedSubtotal = Math.max(0, subtotal - promoDiscount);
  // Standard Sri Lankan VAT calculation (18% inclusive/applicable or zero depending on threshold)
  const estimatedTax = Math.round(discountedSubtotal * 0.18);
  const finalPayable = discountedSubtotal + estimatedTax;

  async function handleApplyPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!promoCode.trim()) return;

    setValidatingPromo(true);
    setPromoMsg(null);

    try {
      const payload: CartEvaluationInput = {
        subtotal,
        items: items.map((i) => ({
          productId: i.productId,
          sku: i.sku,
          quantity: i.qty,
          unitPrice: Number(i.unitPrice),
          lineSubtotal: Number(i.unitPrice) * i.qty,
        })),
        promoCode: promoCode.trim(),
        channel: 'STOREFRONT',
      };

      const res = await fetch('/api/promotions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const discount = data.evaluation?.discountTotal ?? data.evaluation?.discountAmount ?? 0;
      if (data.success && discount > 0) {
        setPromoDiscount(discount);
        setAppliedCode(promoCode.trim().toUpperCase());
        setPromoMsg(`Coupon applied: Save ${money(discount)}!`);
      } else {
        setPromoDiscount(0);
        setAppliedCode(null);
        setPromoMsg(data.evaluation?.error || data.evaluation?.rejectionReason || 'Invalid promotion code');
      }
    } catch {
      setPromoMsg('Unable to validate promo code');
    } finally {
      setValidatingPromo(false);
    }
  }

  function handleRemovePromo() {
    setAppliedCode(null);
    setPromoDiscount(0);
    setPromoCode('');
    setPromoMsg(null);
  }

  // Generate WhatsApp order message
  const waMessage = encodeURIComponent(
    `Hello! I would like to place an order from your online store:\n\n` +
      items.map((i) => `• ${i.name} (Qty: ${i.qty}) - ${money(Number(i.unitPrice) * i.qty)}`).join('\n') +
      `\n\nSubtotal: ${money(subtotal)}` +
      (appliedCode ? `\nPromo (${appliedCode}): -${money(promoDiscount)}` : '') +
      `\nTotal: ${money(finalPayable)}\n\nPlease confirm availability and delivery details.`,
  );
  const waUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone.replace(/[^0-9]/g, '')}?text=${waMessage}`
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Slide-over panel */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-screen max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white leading-tight">Your Shopping Bag</h2>
                    <p className="text-xs text-slate-400">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Close bag"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {items.length === 0 ? (
                  <div className="text-center py-16 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mx-auto">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-300">Your bag is currently empty</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        Explore our live catalog to discover apparel, gadgets, and seasonal deals.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                            {item.variant && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-mono text-[10px]">
                                {item.variant}
                              </span>
                            )}
                            <span>{money(Number(item.unitPrice))}</span>
                          </div>
                          <div className="font-mono font-bold text-xs text-amber-400 mt-1">
                            {money(Number(item.unitPrice) * item.qty)}
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl p-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.id, item.qty - 1)}
                            className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-mono font-bold text-white">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.id, item.qty + 1)}
                            className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors shrink-0"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Summary & Actions */}
              {items.length > 0 && (
                <div className="p-6 border-t border-slate-800 bg-slate-900/90 space-y-4">
                  {/* Promo Code Input */}
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="PROMO CODE"
                        disabled={!!appliedCode || validatingPromo}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                      />
                    </div>
                    {appliedCode ? (
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-rose-400 hover:bg-slate-700"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={validatingPromo || !promoCode.trim()}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors disabled:opacity-40"
                      >
                        {validatingPromo ? '...' : 'Apply'}
                      </button>
                    )}
                  </form>

                  {promoMsg && (
                    <div
                      className={`text-xs p-2.5 rounded-xl border flex items-center gap-1.5 ${
                        appliedCode
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>{promoMsg}</span>
                    </div>
                  )}

                  {/* Calculations breakdown */}
                  <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800 pt-3">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono text-white">{money(subtotal)}</span>
                    </div>
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-medium">
                        <span>Promotion ({appliedCode})</span>
                        <span className="font-mono">-{money(promoDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Estimated VAT (18%)</span>
                      <span className="font-mono text-white">{money(estimatedTax)}</span>
                    </div>
                    <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                      <span>Total Payable</span>
                      <span className="font-mono text-amber-400 text-base">{money(finalPayable)}</span>
                    </div>
                  </div>

                  {/* Checkout CTA */}
                  <div className="space-y-2 pt-1">
                    <Link
                      href="/shop/checkout"
                      onClick={onClose}
                      className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Order via WhatsApp</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Secure Sri Lanka Checkout · M3 Certified Economics</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
