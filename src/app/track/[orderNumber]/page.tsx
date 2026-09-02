'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type TrackData = {
  type: string;
  order?: {
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    grandTotal: number;
    progress: Array<{ step: string; label: string; done: boolean; current: boolean }>;
  };
  repair?: {
    ticketCode: string;
    status: string;
    deviceModel: string;
    timeline: Array<{ step: string; label: string; done: boolean; current: boolean }>;
  };
  delivery?: {
    courierPartner: string | null;
    trackingNumber: string | null;
    status: string;
    koombiyoUrl: string | null;
  } | null;
  hirePurchase?: {
    contractNumber: string;
    monthlyEmi: number;
    paidMonths: number;
    totalMonths: number;
    nextDueDate: string | null;
    status: string;
  } | null;
  items?: Array<{ name: string; quantity: number; lineTotal: number }>;
  invoiceUrl?: string;
  error?: string;
};

export default function TrackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderNumber = String(params.orderNumber || '');
  const [phoneLast4, setPhoneLast4] = useState(searchParams.get('phoneLast4') || '');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup() {
    if (!phoneLast4 && !token) {
      setError('Enter phone last 4 digits or tracking token');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        orderNumber,
        ...(phoneLast4 ? { phoneLast4 } : {}),
        ...(token ? { token } : {}),
      });
      const res = await fetch(`/api/orders/track?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Not found');
      setData(json);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if ((phoneLast4.length >= 4 || token) && orderNumber) void lookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = data?.order?.progress || data?.repair?.timeline || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 max-w-lg mx-auto">
      <Link href="/store" className="text-emerald-400 text-sm">
        ← Back to store
      </Link>
      <h1 className="text-2xl font-bold mt-4">Track order</h1>
      <p className="text-zinc-400 text-sm mt-1">{orderNumber}</p>

      <div className="mt-6 space-y-3">
        <input
          value={phoneLast4}
          onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(-4))}
          placeholder="Phone last 4 digits"
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800"
          maxLength={4}
        />
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Or tracking token"
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800"
        />
        <button
          type="button"
          onClick={() => void lookup()}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-500 text-zinc-950 font-bold"
        >
          {loading ? 'Looking up…' : 'Track'}
        </button>
      </div>

      {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}

      {data?.order && (
        <div className="mt-8 space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <p className="text-xs text-zinc-500">Status</p>
            <p className="font-semibold">{data.order.orderStatus}</p>
            <p className="text-sm text-zinc-400">
              Payment: {data.order.paymentStatus} · Fulfillment: {data.order.fulfillmentStatus}
            </p>
            <p className="text-emerald-400 font-bold mt-2">LKR {data.order.grandTotal.toLocaleString()}</p>
          </div>

          <ol className="space-y-2">
            {progress.map((s) => (
              <li
                key={s.step}
                className={`flex items-center gap-2 text-sm ${s.done ? 'text-emerald-400' : 'text-zinc-500'} ${s.current ? 'font-bold' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full ${s.done ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                {s.label}
              </li>
            ))}
          </ol>

          {data.delivery?.trackingNumber && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm">
              <p className="font-semibold">{data.delivery.courierPartner || 'Courier'}</p>
              <p>Tracking: {data.delivery.trackingNumber}</p>
              {data.delivery.koombiyoUrl && (
                <a href={data.delivery.koombiyoUrl} target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                  Track on Koombiyo
                </a>
              )}
            </div>
          )}

          {data.hirePurchase && (
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 text-sm">
              <p className="font-semibold">Hire Purchase · {data.hirePurchase.contractNumber}</p>
              <p>
                EMI LKR {data.hirePurchase.monthlyEmi.toLocaleString()} · {data.hirePurchase.paidMonths}/
                {data.hirePurchase.totalMonths} paid
              </p>
              <Link href="/shop/checkout" className="text-purple-300 underline mt-2 inline-block">
                Pay via PayHere
              </Link>
            </div>
          )}

          {data.invoiceUrl && (
            <a
              href={data.invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center py-3 rounded-xl border border-zinc-700 text-sm font-semibold"
            >
              Download tax invoice (print/PDF)
            </a>
          )}
        </div>
      )}

      {data?.repair && (
        <div className="mt-8 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <p className="font-semibold">Repair {data.repair.ticketCode}</p>
          <p className="text-sm text-zinc-400">{data.repair.deviceModel}</p>
          <ol className="mt-4 space-y-2">
            {data.repair.timeline.map((s) => (
              <li key={s.step} className={`text-sm ${s.done ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {s.label} {s.current ? '←' : ''}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
