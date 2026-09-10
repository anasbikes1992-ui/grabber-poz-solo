'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquareText, Send, CheckCheck, ShoppingCart, Truck, BookOpen } from 'lucide-react';
import { IntegrationHealthBanner } from '@/components/ui/integration-health-banner';

type WhatsAppTemplate = {
  id: string;
  name: string;
  body: string;
};

type Thread = {
  id: string;
  phone: string;
  lastPreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

type Msg = {
  id: string;
  direction: 'IN' | 'OUT';
  body: string;
  status: string;
  createdAt: string;
};

function renderTemplate(body: string, vars: Record<string, string | number>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

export default function WhatsAppCommercePage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toPhone, setToPhone] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    const res = await fetch('/api/whatsapp/templates');
    const data = await res.json();
    setTemplates(data.templates || []);
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/threads');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load threads');
      setThreads(data.threads || []);
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    const res = await fetch(`/api/whatsapp/threads?threadId=${encodeURIComponent(threadId)}`);
    const data = await res.json();
    if (data.success) setMessages(data.messages || []);
  }, []);

  useEffect(() => {
    void loadTemplates();
    void loadThreads();
  }, [loadTemplates, loadThreads]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  function selectThread(t: Thread) {
    setSelectedId(t.id);
    setToPhone(t.phone);
  }

  async function sendText(text: string) {
    const phone = toPhone.replace(/\D/g, '');
    if (!phone) {
      setLoadError('Enter a customer phone first');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/whatsapp/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, text }),
      });
      const data = await res.json();
      if (!data.success) {
        // fallback to legacy send if threads table missing
        const legacy = await fetch('/api/integrations/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: phone, text }),
        });
        const ld = await legacy.json();
        if (!ld.success) throw new Error(data.error || ld.error || 'Send failed');
      }
      if (data.threadId) setSelectedId(data.threadId);
      await loadThreads();
      if (selectedId || data.threadId) await loadMessages(data.threadId || selectedId!);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendTemplate(template: WhatsAppTemplate, vars: Record<string, string | number>) {
    await sendText(renderTemplate(template.body, vars));
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput('');
    void sendText(text);
  }

  const confirmTpl = templates.find((t) => t.name === 'order_confirmation') || templates[0];
  const selected = threads.find((t) => t.id === selectedId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">WhatsApp Commerce & Inbox</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Persisted threads from inbound webhook + staff sends. Inbound: Hi → menu · *1* order · *2* repairs · *3* staff.
        </p>
        <p className="text-[10px] text-zinc-500 mt-2 font-mono">
          Webhook: /api/whatsapp/webhook · Apply migration 0012_whatsapp_threads.sql on prod
        </p>
      </div>

      <IntegrationHealthBanner service="whatsapp" />
      {loadError && (
        <p role="alert" className="text-xs text-amber-500">
          {loadError}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3 text-xs">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-emerald-500" /> Threads
          </h3>
          <div>
            <label htmlFor="wa-new-phone" className="text-muted-foreground block mb-1 font-medium">
              New / focus phone (E.164 digits)
            </label>
            <input
              id="wa-new-phone"
              value={toPhone}
              onChange={(e) => {
                setToPhone(e.target.value.replace(/\D/g, ''));
                setSelectedId(null);
              }}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono"
              placeholder="94771234567"
            />
          </div>
          <div className="space-y-1 max-h-[360px] overflow-y-auto">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectThread(t)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  selectedId === t.id ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-border hover:bg-secondary/50'
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-mono font-bold">{t.phone}</span>
                  {t.unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 rounded-full bg-emerald-500 text-zinc-950 font-bold">
                      {t.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{t.lastPreview || '—'}</p>
              </button>
            ))}
            {threads.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No threads yet — send a message or wait for inbound.</p>
            )}
          </div>

          <div className="pt-2 border-t border-border space-y-2">
            <p className="font-semibold text-foreground">Quick templates</p>
            {confirmTpl && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void sendTemplate(confirmTpl, {
                    order_number: 'ORD-DEMO',
                    total: '4500',
                    customer_name: 'Customer',
                  })
                }
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 disabled:opacity-50"
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Order confirmation
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendText('Your order is out for delivery. Track with your order link.')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 disabled:opacity-50"
            >
              <Truck className="h-3.5 w-3.5" /> Dispatch update
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendText('Hi! Reply *menu* for options: 1 Orders · 2 Repairs · 3 Staff.')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 disabled:opacity-50"
            >
              <BookOpen className="h-3.5 w-3.5" /> Welcome / menu
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 p-0 rounded-2xl bg-card border border-border shadow-sm flex flex-col min-h-[480px] overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-sm">{selected?.phone || toPhone || 'No conversation selected'}</p>
              <p className="text-muted-foreground flex items-center gap-1">
                <CheckCheck className="h-3 w-3" /> Staff inbox
              </p>
            </div>
            <button type="button" onClick={() => void loadThreads()} className="text-[10px] font-bold text-emerald-500 hover:underline">
              Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/20">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs whitespace-pre-wrap ${
                    m.direction === 'OUT'
                      ? 'bg-emerald-500 text-zinc-950 rounded-br-md'
                      : 'bg-card border border-border rounded-bl-md'
                  }`}
                >
                  {m.body}
                  <p className="text-[9px] opacity-70 mt-1">
                    {m.status} · {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-16">
                Messages for this phone will appear here after send or inbound webhook.
              </p>
            )}
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
            <label htmlFor="wa-compose" className="sr-only">
              Message
            </label>
            <input
              id="wa-compose"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              placeholder="Type a reply…"
              className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="h-10 w-10 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
