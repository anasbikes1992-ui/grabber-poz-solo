'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, X, Send, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

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
  confirmationDetails?: {
    actionDescription?: string;
    riskSummary?: string;
    payload?: Record<string, unknown>;
  };
  status?: 'PENDING' | 'CONFIRMED' | 'REJECTED';
}

export function JarvisDrawer({ isOpen, onClose }: JarvisDrawerProps) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_1',
      sender: 'jarvis',
      text: 'Hello! I am Jarvis — grounded on your live database. Ask about today\'s sales, low stock, pending orders, or Polim Potha balances.',
    },
  ]);

  const loadBrief = useCallback(async () => {
    try {
      const res = await fetch('/api/jarvis/brief');
      const data = await res.json();
      if (data.success && data.brief?.summary) {
        setMessages((prev) => [
          ...prev,
          { id: `brief_${Date.now()}`, sender: 'jarvis', text: data.brief.summary as string },
        ]);
      }
    } catch {
      /* optional brief */
    }
  }, []);

  useEffect(() => {
    if (isOpen) void loadBrief();
  }, [isOpen, loadBrief]);

  if (!isOpen) return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;

    const userMsg: Message = { id: `msg_${Date.now()}`, sender: 'user', text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    const query = input.trim();
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const jarvisResponse: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: 'jarvis',
        text: data.reply || data.errorMessage || 'No response.',
        actionRequired: data.status === 'CONFIRMATION_REQUIRED',
        confirmationToken: data.confirmationToken,
        confirmationDetails: data.confirmationDetails,
        status: data.status === 'CONFIRMATION_REQUIRED' ? 'PENDING' : undefined,
      };
      setMessages((prev) => [...prev, jarvisResponse]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `err_${Date.now()}`, sender: 'jarvis', text: (err as Error).message },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmAction(msgId: string, token: string) {
    setBusy(true);
    try {
      const res = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationToken: token }),
      });
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                status: data.status === 'EXECUTED' ? 'CONFIRMED' : 'REJECTED',
                text: data.reply || data.errorMessage || m.text,
                actionRequired: false,
              }
            : m,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200">
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
            <p className="text-[11px] text-muted-foreground">Live DB tools</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`p-3 rounded-2xl max-w-[88%] whitespace-pre-wrap ${
                m.sender === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-none shadow-sm'
                  : 'bg-secondary/70 border border-border text-foreground rounded-tl-none'
              }`}
            >
              <p className="text-xs leading-relaxed">{m.text}</p>

              {m.actionRequired && m.status === 'PENDING' && m.confirmationToken && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Confirmation required</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3">{m.confirmationDetails?.riskSummary}</p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleConfirmAction(m.id, m.confirmationToken!)}
                    className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                  >
                    <span>Authorize & Execute</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {m.status === 'CONFIRMED' && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Executed with audit trail</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={(e) => void handleSend(e)} className="p-3 border-t border-border bg-card/80 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          placeholder="Ask about sales, stock, orders..."
          className="flex-1 px-3 py-2 text-xs rounded-xl bg-secondary/80 border border-border focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <button type="submit" disabled={busy} className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95 shrink-0 disabled:opacity-50">
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
