'use client';

import React, { useState } from 'react';
import { MessageSquareText, Send, CheckCheck, Clock, ShoppingCart, Truck, BookOpen, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'customer' | 'bot' | 'agent';
  text: string;
  timestamp: string;
}

export default function WhatsAppCommercePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'customer', text: 'Hi! Do you have the Linen Casual Shirt in Size L Blue available at Colombo store?', timestamp: '10:14 AM' },
    { id: '2', sender: 'bot', text: 'Hello Nimal! 👋 Yes, we have 31 units available at Colombo Main Branch for LKR 4,500 (+18% VAT). Would you like islandwide COD delivery or in-store pickup?', timestamp: '10:14 AM' },
    { id: '3', sender: 'customer', text: 'Please dispatch 1 unit via COD to Mount Lavinia.', timestamp: '10:16 AM' },
    { id: '4', sender: 'bot', text: 'Order confirmed! 🎉 Order #WA-2026-3001 created. Total: LKR 5,310.00. Handed over to Koombiyo Courier (Tracking #KMB-112233).', timestamp: '10:16 AM' },
  ]);

  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      text: input,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput('');
  };

  const sendQuickTemplate = (templateType: 'CONFIRM' | 'TRACKING' | 'POLIM_POTHA') => {
    let text = '';
    if (templateType === 'CONFIRM') {
      text = 'Your order #POS-2026-1001 has been confirmed! Receipt total: LKR 10,620.00. Thank you for shopping with Grabber.';
    } else if (templateType === 'TRACKING') {
      text = 'Your package is on its way! Track live via Koombiyo: https://koombiyo.lk/track?no=KMB-112233';
    } else {
      text = 'Polim Potha Reminder: Your outstanding balance of LKR 11,240.00 is due. You can pay in-store or online via PayHere.';
    }

    const templateMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'bot',
      text,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, templateMsg]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>WhatsApp Commerce & Automation</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
              Hotline Connected
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated customer order confirmation, dispatch tracking links, and Polim Potha credit balance reminders.
          </p>
        </div>
      </div>

      {/* Grid: Quick Action Templates vs Simulated Live Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Quick Automation Templates */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3 text-xs">
          <h3 className="font-bold text-sm text-foreground">One-Click Message Dispatch</h3>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Send grounded transaction messages directly to customer WhatsApp threads:
          </p>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => sendQuickTemplate('CONFIRM')}
              className="w-full p-3 rounded-xl bg-secondary/70 hover:bg-secondary border border-border text-left space-y-1 transition-all"
            >
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
                <span>Send Order Receipt Bill</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Order #POS-1001 &bull; LKR 10,620.00</p>
            </button>

            <button
              onClick={() => sendQuickTemplate('TRACKING')}
              className="w-full p-3 rounded-xl bg-secondary/70 hover:bg-secondary border border-border text-left space-y-1 transition-all"
            >
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Truck className="h-3.5 w-3.5 text-purple-500" />
                <span>Send Courier Tracking Link</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Koombiyo #KMB-112233</p>
            </button>

            <button
              onClick={() => sendQuickTemplate('POLIM_POTHA')}
              className="w-full p-3 rounded-xl bg-secondary/70 hover:bg-secondary border border-border text-left space-y-1 transition-all"
            >
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                <span>Send Polim Potha Balance Due</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Sarath Perera &bull; LKR 11,240.00</p>
            </button>
          </div>
        </div>

        {/* Right 8 Cols: WhatsApp Chat Interface */}
        <div className="lg:col-span-8 rounded-2xl bg-card border border-border shadow-sm flex flex-col h-[520px] overflow-hidden">
          {/* WhatsApp Header */}
          <div className="p-3.5 bg-emerald-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                NS
              </div>
              <div>
                <h4 className="font-bold text-xs">Nimal Silva (+94 70 111 2233)</h4>
                <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping" />
                  <span>Online via WhatsApp Hotline</span>
                </p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-secondary/20 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'customer' ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[80%] shadow-sm ${
                    m.sender === 'customer'
                      ? 'bg-card border border-border text-foreground rounded-tl-none'
                      : m.sender === 'bot'
                      ? 'bg-emerald-600/10 border border-emerald-500/30 text-foreground rounded-tr-none'
                      : 'bg-primary text-primary-foreground rounded-tr-none'
                  }`}
                >
                  <p className="leading-relaxed">{m.text}</p>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
                    <span>{m.timestamp}</span>
                    {m.sender !== 'customer' && <CheckCheck className="h-3 w-3 text-emerald-500" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type message to customer..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-95 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
