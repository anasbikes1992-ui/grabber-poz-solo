'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Box,
  TrendingUp,
  Clock,
  Users,
  Tag,
} from 'lucide-react';
import { useDrawerA11y } from '@/hooks/use-drawer-a11y';
import { VoiceAssistant } from '@/lib/hardware/voice-assistant';

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

const QUICK_PROMPTS = [
  { label: '💎 Inventory Value', query: 'What is the total value of goods in stock?' },
  { label: '📦 Low Stock', query: 'What is low in my stocks?' },
  { label: '📊 Total Inventory', query: 'What is my current inventory on hand?' },
  { label: '💰 Today Sales', query: "How are today's sales and revenue?" },
  { label: '🚚 Pending Orders', query: 'What are the pending orders?' },
  { label: '👥 Polim Potha', query: 'Show customer credit and aging balances' },
  { label: '🔥 Top Products', query: 'What are the top selling products this week?' },
];

export function JarvisDrawer({ isOpen, onClose }: JarvisDrawerProps) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_1',
      sender: 'jarvis',
      text: "Hello! I am Jarvis — grounded on your live database. Ask about today's sales, low stock, total inventory valuation, pending orders, or Polim Potha balances.",
    },
  ]);
  const panelRef = useDrawerA11y(isOpen, onClose);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    return () => {
      VoiceAssistant.stopListening();
      VoiceAssistant.stopSpeaking();
    };
  }, [isOpen, loadBrief]);

  if (!isOpen) return null;

  async function submitQuery(queryText: string) {
    if (!queryText.trim() || busy) return;

    const userMsg: Message = { id: `msg_${Date.now()}`, sender: 'user', text: queryText.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryText.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const replyText = data.reply || data.errorMessage || 'No response from database.';
      const jarvisResponse: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: 'jarvis',
        text: replyText,
        actionRequired: data.status === 'CONFIRMATION_REQUIRED',
        confirmationToken: data.confirmationToken,
        confirmationDetails: data.confirmationDetails,
        status: data.status === 'CONFIRMATION_REQUIRED' ? 'PENDING' : undefined,
      };
      setMessages((prev) => [...prev, jarvisResponse]);

      if (ttsEnabled) {
        void VoiceAssistant.speak(replyText);
      }
    } catch (err) {
      const errMsg = (err as Error).message;
      setMessages((prev) => [
        ...prev,
        { id: `err_${Date.now()}`, sender: 'jarvis', text: errMsg },
      ]);
      if (ttsEnabled) {
        void VoiceAssistant.speak(errMsg);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    void submitQuery(input);
  }

  function toggleVoiceInput() {
    if (isListening) {
      VoiceAssistant.stopListening();
      setIsListening(false);
      return;
    }

    const started = VoiceAssistant.startListening({
      onStart: () => setIsListening(true),
      onEnd: () => setIsListening(false),
      onError: () => {
        setIsListening(false);
      },
      onResult: (transcript, isFinal) => {
        setInput(transcript);
        if (isFinal && transcript.trim()) {
          setIsListening(false);
          VoiceAssistant.stopListening();
          void submitQuery(transcript);
        }
      },
    });

    if (!started) {
      setIsListening(false);
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
      const replyText = data.reply || data.errorMessage || 'Staged action executed.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                status: data.status === 'EXECUTED' ? 'CONFIRMED' : 'REJECTED',
                text: replyText,
                actionRequired: false,
              }
            : m,
        ),
      );
      if (ttsEnabled) {
        void VoiceAssistant.speak(replyText);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Backdrop Scrim - click to dismiss */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={panelRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jarvis-drawer-title"
        className="fixed inset-y-0 right-0 w-full sm:w-[420px] max-w-full bg-zinc-950/98 border-l border-zinc-800 shadow-2xl z-50 flex flex-col backdrop-blur-2xl animate-in slide-in-from-right duration-200 text-zinc-100"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-zinc-950 shadow-glow-em">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h3 id="jarvis-drawer-title" className="font-bold text-sm text-white flex items-center gap-1.5">
                Jarvis Copilot
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                  Live DB
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">Autonomous Business Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const next = !ttsEnabled;
                setTtsEnabled(next);
                if (!next) VoiceAssistant.stopSpeaking();
              }}
              title={ttsEnabled ? 'Mute Voice Responses' : 'Enable Voice Audio Responses'}
              className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                ttsEnabled ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() =>
                setMessages([
                  {
                    id: `msg_${Date.now()}`,
                    sender: 'jarvis',
                    text: 'Chat history cleared. How can I assist you with your business today?',
                  },
                ])
              }
              title="Clear conversation"
              className="h-8 px-2 rounded-lg hover:bg-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Jarvis"
              className="h-8 w-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`p-3.5 rounded-2xl max-w-[92%] whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-emerald-500 text-zinc-950 font-semibold rounded-tr-xs shadow-md text-xs leading-relaxed'
                    : 'bg-zinc-900/90 border border-zinc-800/90 text-zinc-100 rounded-tl-xs text-xs leading-relaxed shadow-sm'
                }`}
              >
                <p>{m.text}</p>

                {m.actionRequired && m.status === 'PENDING' && m.confirmationToken && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Confirmation Required</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mb-3">{m.confirmationDetails?.riskSummary}</p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleConfirmAction(m.id, m.confirmationToken!)}
                      className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                    >
                      <span>Authorize & Execute</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {m.status === 'CONFIRMED' && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Executed with audit trail</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Quick Prompts Carousel */}
        <div className="px-3 py-2.5 border-t border-zinc-800/80 bg-zinc-900/60 flex gap-2 overflow-x-auto no-scrollbar">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={busy}
              onClick={() => void submitQuery(p.query)}
              className="px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-emerald-500/15 border border-zinc-700 hover:border-emerald-500/50 text-[11px] font-medium text-zinc-200 hover:text-emerald-300 whitespace-nowrap transition-all shrink-0 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input Bar with Voice Mic */}
        <form onSubmit={handleSend} className="p-3 sm:p-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={toggleVoiceInput}
            title={isListening ? 'Stop listening' : 'Speak to Jarvis (Voice Command)'}
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800'
            }`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <input
            data-autofocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder={isListening ? 'Listening... speak your command' : 'Ask about sales, stock, valuation...'}
            className={`flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-900 border text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50 ${
              isListening ? 'border-rose-500/80 bg-rose-950/20' : 'border-zinc-800'
            }`}
          />

          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
            className="h-9 w-9 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center hover:bg-emerald-400 transition-all shadow-glow-em shrink-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </div>
    </>
  );
}
