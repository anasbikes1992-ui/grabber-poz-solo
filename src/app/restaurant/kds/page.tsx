'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Clock,
  Flame,
  CheckCircle2,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertTriangle,
  Layers,
  ArrowLeft,
} from 'lucide-react';

type KdsItem = {
  productId?: string;
  name: string;
  qty: number;
  notes?: string;
  station?: string;
  course?: string;
  price: number;
};

type KdsTicket = {
  id: string;
  kotNumber: string;
  tableId?: string | null;
  tableName: string;
  waiterName?: string | null;
  status: 'OPEN' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED';
  items: KdsItem[];
  totalAmount: number;
  createdAt: string;
  elapsedMinutes: number;
  urgency: 'NORMAL' | 'WARNING' | 'CRITICAL';
  station?: string;
};

const STATIONS = ['ALL', 'KITCHEN', 'GRILL', 'BAR', 'DESSERT', 'PACKING'] as const;

export default function KitchenDisplayPage() {
  const [station, setStation] = useState<string>('ALL');
  const [tickets, setTickets] = useState<KdsTicket[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<KdsTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [bumpingId, setBumpingId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prevTicketCount = useRef(0);

  const playChime = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // AudioContext blocked or not supported
    }
  }, [soundEnabled]);

  const loadKds = useCallback(async () => {
    try {
      const res = await fetch(`/api/restaurant/kds?station=${station}`);
      const data = await res.json();
      if (data.success) {
        const nextTickets: KdsTicket[] = data.tickets || [];
        if (nextTickets.length > prevTicketCount.current && prevTicketCount.current > 0) {
          playChime();
        }
        prevTicketCount.current = nextTickets.length;
        setTickets(nextTickets);
        setRecentCompleted(data.recentCompleted || []);
      }
    } catch {
      // Offline fallback / transient error
    } finally {
      setLoading(false);
    }
  }, [station, playChime]);

  useEffect(() => {
    loadKds();
    const interval = setInterval(loadKds, 5000); // 5s live polling
    return () => clearInterval(interval);
  }, [loadKds]);

  const handleBump = async (ticketId: string) => {
    setBumpingId(ticketId);
    try {
      const res = await fetch('/api/restaurant/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bump', ticketId }),
      });
      const data = await res.json();
      if (data.success) {
        playChime();
        await loadKds();
      }
    } catch (e) {
      alert('Failed to bump ticket: ' + (e as Error).message);
    } finally {
      setBumpingId(null);
    }
  };

  const handleReopen = async (ticketId: string) => {
    setBumpingId(ticketId);
    try {
      const res = await fetch('/api/restaurant/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen', ticketId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadKds();
      }
    } catch (e) {
      alert('Failed to reopen ticket: ' + (e as Error).message);
    } finally {
      setBumpingId(null);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none">
      {/* KDS Header */}
      <header className="px-6 py-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between sticky top-0 z-20 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link
            href="/restaurant"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
            title="Back to Floor Plan"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
                KITCHEN DISPLAY SYSTEM (KDS)
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </h1>
              <p className="text-xs text-zinc-400">Station ticket pacing & order progression</p>
            </div>
          </div>
        </div>

        {/* Station Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          {STATIONS.map((st) => (
            <button
              key={st}
              onClick={() => {
                setLoading(true);
                setStation(st);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                station === st
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition ${
              soundEnabled
                ? 'bg-zinc-800 text-emerald-400 border-zinc-700'
                : 'bg-zinc-800 text-zinc-500 border-zinc-700'
            }`}
            title={soundEnabled ? 'Mute Sound Chimes' : 'Enable Sound Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={() => loadKds()}
            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold transition flex items-center gap-2 text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            REFRESH
          </button>
        </div>
      </header>

      {/* Main Board */}
      <main className="flex-1 p-6 overflow-x-auto">
        {loading && tickets.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-zinc-500 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Connecting to kitchen ticket stream...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-zinc-500 gap-3 border-2 border-dashed border-zinc-800/80 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/40" />
            <h2 className="text-base font-bold text-zinc-400">All Kitchen Orders Cleared!</h2>
            <p className="text-xs text-zinc-500 max-w-sm text-center">
              No active tickets in {station} station. New POS orders and table KOTs will chime automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
            {tickets.map((t) => {
              const isCritical = t.urgency === 'CRITICAL';
              const isWarning = t.urgency === 'WARNING';
              const borderClass = isCritical
                ? 'border-rose-500 shadow-lg shadow-rose-950/40'
                : isWarning
                ? 'border-amber-500 shadow-md shadow-amber-950/30'
                : 'border-zinc-800';

              const headerBg = isCritical
                ? 'bg-rose-950/40 text-rose-300'
                : isWarning
                ? 'bg-amber-950/30 text-amber-300'
                : 'bg-zinc-900 text-zinc-300';

              return (
                <div
                  key={t.id}
                  className={`bg-zinc-900/80 rounded-2xl border ${borderClass} overflow-hidden flex flex-col transition-all duration-200`}
                >
                  {/* Card Header */}
                  <div className={`p-4 ${headerBg} border-b border-zinc-800/80 flex items-center justify-between`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base tracking-wide text-white">{t.kotNumber}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            t.status === 'READY'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : t.status === 'PREPARING'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-zinc-300 mt-0.5">{t.tableName}</div>
                    </div>

                    {/* Timer */}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isCritical
                          ? 'bg-rose-500 text-white animate-pulse'
                          : isWarning
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{t.elapsedMinutes}m</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 flex-1 divide-y divide-zinc-800/50 space-y-3">
                    {t.items.map((item, idx) => (
                      <div key={idx} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {item.qty}
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-zinc-100">{item.name}</div>
                            {item.notes && (
                              <div className="text-xs text-amber-400 font-medium italic mt-0.5 flex items-center gap-1">
                                <Flame className="w-3 h-3" />
                                {item.notes}
                              </div>
                            )}
                            {item.course && (
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                                {item.course}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer: BUMP / ACTION */}
                  <div className="p-3 bg-zinc-950/60 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-zinc-500">
                      {t.waiterName ? `Server: ${t.waiterName}` : 'POS Cashier'}
                    </span>
                    <button
                      disabled={bumpingId === t.id}
                      onClick={() => handleBump(t.id)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                        t.status === 'READY'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20'
                          : t.status === 'PREPARING'
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      {bumpingId === t.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {t.status === 'OPEN' || t.status === 'CONFIRMED'
                          ? 'START PREP'
                          : t.status === 'PREPARING'
                          ? 'MARK READY'
                          : 'SERVE (BUMP)'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recently Completed / Recall Bar */}
        {recentCompleted.length > 0 && (
          <section className="mt-12 pt-6 border-t border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              RECENTLY COMPLETED TICKETS (RECALL / REOPEN)
            </h3>
            <div className="flex flex-wrap gap-3">
              {recentCompleted.map((rc) => (
                <div
                  key={rc.id}
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs flex items-center gap-3"
                >
                  <div>
                    <span className="font-bold text-zinc-300">{rc.kotNumber}</span>
                    <span className="text-zinc-500 ml-2">{rc.tableName}</span>
                  </div>
                  <button
                    onClick={() => handleReopen(rc.id)}
                    className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                    title="Reopen ticket"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
