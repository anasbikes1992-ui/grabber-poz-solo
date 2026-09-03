'use client';

import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface CartFloatingBarProps {
  itemCount: number;
  subtotal: number;
  onOpenDrawer: () => void;
}

function money(n: number) {
  return `LKR ${n.toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
}

export function CartFloatingBar({ itemCount, subtotal, onOpenDrawer }: CartFloatingBarProps) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-fade-in">
      <button
        type="button"
        onClick={onOpenDrawer}
        className="px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-2xl shadow-amber-500/30 flex items-center gap-3 transition-all transform active:scale-95 border border-amber-300/40"
        aria-label={`View bag with ${itemCount} items, total ${money(subtotal)}`}
      >
        <div className="relative">
          <ShoppingBag className="w-5 h-5 text-slate-950" />
          <span className="absolute -top-2 -right-2 bg-slate-950 text-amber-400 text-[10px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center border border-amber-400">
            {itemCount}
          </span>
        </div>
        <div className="text-left border-l border-slate-950/20 pl-3">
          <div className="text-[10px] uppercase font-bold text-slate-800">Your Bag</div>
          <div className="text-xs font-mono font-black">{money(subtotal)}</div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-950 ml-1" />
      </button>
    </div>
  );
}
