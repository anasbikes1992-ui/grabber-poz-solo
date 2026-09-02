'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Event = { at: string; stage: string; detail: string };

export default function SerialLifecyclePage() {
  const params = useParams();
  const imei = String(params.imei || '');
  const [events, setEvents] = useState<Event[]>([]);
  const [serial, setSerial] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/serials/lifecycle?imei=${encodeURIComponent(imei)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error);
        setSerial(d.serial);
        setEvents(d.events || []);
      })
      .catch((e) => setError((e as Error).message));
  }, [imei]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 max-w-2xl mx-auto">
      <Link href="/products" className="text-emerald-400 text-sm">
        ← Inventory
      </Link>
      <h1 className="text-2xl font-bold mt-4">IMEI 360° Lifecycle</h1>
      <p className="font-mono text-emerald-400 mt-1">{imei}</p>

      {error && <p className="text-red-400 mt-4">{error}</p>}

      {serial && (
        <div className="mt-6 p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm">
          <p>{String(serial.productName)} · {String(serial.sku)}</p>
          <p className="text-zinc-400">Status: {String(serial.status)}</p>
        </div>
      )}

      <ol className="mt-8 border-l border-zinc-800 pl-4 space-y-4">
        {events.map((e, i) => (
          <li key={`${e.stage}-${i}`} className="relative">
            <span className="absolute -left-[1.35rem] w-2 h-2 rounded-full bg-emerald-500 top-1" />
            <p className="text-xs text-zinc-500">{new Date(e.at).toLocaleString()}</p>
            <p className="font-semibold text-sm">{e.stage.replace(/_/g, ' ')}</p>
            <p className="text-zinc-400 text-sm">{e.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
