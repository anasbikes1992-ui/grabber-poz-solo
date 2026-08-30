'use client';

import React, { useState } from 'react';
import { Sparkles, X, Send, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';

interface JarvisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  actionRequired?: boolean;
  confirmationToken?: string;
  details?: any;
  status?: 'PENDING' | 'CONFIRMED' | 'REJECTED';
}

export function JarvisDrawer({ isOpen, onClose }: JarvisDrawerProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_1',
      sender: 'jarvis',
      text: 'Hello! I am Jarvis, your grounded Business OS Copilot. I can query real-time stock balances, analyze Polim Potha aging, draft supplier POs, or prepare stock transfers with your confirmation.',
    },
  ]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    const query = input.toLowerCase();
    setInput('');

    // Simulate intelligent grounded response
    setTimeout(() => {
      if (query.includes('transfer') || query.includes('move')) {
        const jarvisResponse: Message = {
          id: `msg_${Date.now() + 1}`,
          sender: 'jarvis',
          text: 'I have staged an inter-location stock transfer based on your request. Because this will mutate physical inventory, your confirmation is required:',
          actionRequired: true,
          confirmationToken: `CONFIRM_${Date.now()}`,
          status: 'PENDING',
          details: {
            from: 'Central Warehouse (WH-01)',
            to: 'Colombo Main Branch (BR-01)',
            items: [{ name: 'Linen Casual Shirt (Size L / Blue)', quantity: 20 }],
          },
        };
        setMessages((prev) => [...prev, jarvisResponse]);
      } else if (query.includes('credit') || query.includes('polim')) {
        const jarvisResponse: Message = {
          id: `msg_${Date.now() + 1}`,
          sender: 'jarvis',
          text: 'Polim Potha AR Summary: Total Outstanding is LKR 21,240.00. 100% is currently in the 0–30 days current bucket with zero overdue accounts.',
        };
        setMessages((prev) => [...prev, jarvisResponse]);
      } else {
        const jarvisResponse: Message = {
          id: `msg_${Date.now() + 1}`,
          sender: 'jarvis',
          text: `Real-time database check: Today's net sales across POS, Storefront, and WhatsApp is LKR 37,170.00. Colombo Branch stock is healthy with 31 units on hand.`,
        };
        setMessages((prev) => [...prev, jarvisResponse]);
      }
    }, 600);
  };

  const handleConfirmAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              status: 'CONFIRMED',
              text: 'Transfer Confirmed & Executed! Physical stock ledger updated with TRANSFER_OUT from Central Warehouse and TRANSFER_IN to Colombo Branch.',
            }
          : m
      )
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/40">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              Jarvis Copilot
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Grounded</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">Action Tier: Authenticated</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`p-3 rounded-2xl max-w-[88%] ${
                m.sender === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-none shadow-sm'
                  : 'bg-secondary/70 border border-border text-foreground rounded-tl-none'
              }`}
            >
              <p className="text-xs leading-relaxed">{m.text}</p>

              {/* High-Risk Action Confirmation Box */}
              {m.actionRequired && m.status === 'PENDING' && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>High-Risk Action Proposal</span>
                  </div>
                  <div className="text-[11px] space-y-1 text-muted-foreground mb-3">
                    <p><span className="font-semibold text-foreground">Source:</span> {m.details.from}</p>
                    <p><span className="font-semibold text-foreground">Destination:</span> {m.details.to}</p>
                    <p><span className="font-semibold text-foreground">Items:</span> {m.details.items[0].quantity}x {m.details.items[0].name}</p>
                  </div>
                  <button
                    onClick={() => handleConfirmAction(m.id)}
                    className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <span>Authorize & Execute Transfer</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {m.status === 'CONFIRMED' && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Executed with Owner Audit Trail</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-border bg-card/80 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Jarvis or propose an action..."
          className="flex-1 px-3 py-2 text-xs rounded-xl bg-secondary/80 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95 shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
