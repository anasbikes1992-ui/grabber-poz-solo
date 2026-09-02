'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquareText, Send, CheckCheck, ShoppingCart, Truck, BookOpen } from 'lucide-react';

type WhatsAppTemplate = {
  id: string;
  name: string;
  body: string;
};

function renderTemplate(body: string, vars: Record<string, string | number>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

type ChatMessage = {
  id: string;
  sender: 'customer' | 'bot' | 'agent';
  text: string;
  timestamp: string;
};

export default function WhatsAppCommercePage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [toPhone, setToPhone] = useState('94771234567');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'bot', text: 'WhatsApp center connected. Use templates or type a custom message.', timestamp: 'Now' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const loadTemplates = useCallback(async () => {
    const res = await fetch('/api/whatsapp/templates');
    const data = await res.json();
    setTemplates(data.templates || []);
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  async function sendText(text: string, sender: 'bot' | 'agent' = 'agent') {
    setBusy(true);
    try {
      const res = await fetch('/api/integrations/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toPhone, text }),
      });
      const data = await res.json();
      const display = data.success
        ? `${text}${data.stub ? ' (stub — configure WHATSAPP_TOKEN for live send)' : ''}`
        : `Failed: ${data.error}`;
      setMessages((prev) => [
        ...prev,
        { id: `msg_${Date.now()}`, sender, text: display, timestamp: 'Just now' },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function sendTemplate(template: WhatsAppTemplate, vars: Record<string, string | number>) {
    const text = renderTemplate(template.body, vars);
    await sendText(text, 'bot');
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput('');
    void sendText(text, 'agent');
  }

  const confirmTpl = templates.find((t) => t.name === 'order_confirmation') || templates[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">WhatsApp Commerce & Automation</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Inbound flow: Hi → welcome + menu · Reply *1* order · *2* repairs · *3* staff · *menu* restart. Storefront wa.me uses{' '}
          <code className="text-emerald-400">NEXT_PUBLIC_WHATSAPP_NUMBER</code>.
        </p>
        <p className="text-[10px] text-zinc-500 mt-2 font-mono">
          Webhook: /api/whatsapp/webhook · Meta field: messages (subscribe) · Verify token = WHATSAPP_VERIFY_TOKEN
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3 text-xs">
          <h3 className="font-bold text-sm text-foreground">Customer phone (E.164)</h3>
          <input
            value={toPhone}
            onChange={(e) => setToPhone(e.target.value.replace(/\D/g, ''))}
            className="w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono"
            placeholder="94771234567"
          />

          <h3 className="font-bold text-sm text-foreground pt-2">Template dispatch</h3>
          <button
            type="button"
            disabled={busy || !confirmTpl}
            onClick={() =>
              void sendTemplate(confirmTpl!, {
                customerName: 'Customer',
                orderNumber: 'ORD-1001',
                grandTotal: '10,620',
              })
            }
            className="w-full p-3 rounded-xl bg-secondary/70 hover:bg-secondary border border-border text-left"
          >
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
              Order confirmation
            </div>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void sendText('Your package is on its way! Track: https://koombiyo.lk/track?no=KMB-112233', 'bot')}
            className="w-full p-3 rounded-xl bg-secondary/70 hover:bg-secondary border border-border text-left"
          >
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Truck className="h-3.5 w-3.5 text-purple-500" />
              Courier tracking
            </div>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void sendText('Polim Potha reminder: outstanding LKR 11,240.00 due. Pay in-store or online.', 'bot')}
            className="w-full p-3 rounded-xl bg-secondary/70 hover:bg-secondary border border-border text-left"
          >
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <BookOpen className="h-3.5 w-3.5 text-amber-500" />
              Polim balance due
            </div>
          </button>
        </div>

        <div className="lg:col-span-8 rounded-2xl bg-card border border-border shadow-sm flex flex-col h-[520px] overflow-hidden">
          <div className="p-3.5 bg-emerald-700 text-white flex items-center gap-3">
            <MessageSquareText className="h-5 w-5" />
            <div>
              <h4 className="font-bold text-xs">WhatsApp thread</h4>
              <p className="text-[10px] text-emerald-100">To: +{toPhone}</p>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-secondary/20 text-xs">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.sender === 'customer' ? 'items-start' : 'items-end'}`}>
                <div
                  className={`p-3 rounded-2xl max-w-[85%] shadow-sm whitespace-pre-wrap ${
                    m.sender === 'bot'
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

          <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              placeholder="Type message..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button type="submit" disabled={busy} className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
