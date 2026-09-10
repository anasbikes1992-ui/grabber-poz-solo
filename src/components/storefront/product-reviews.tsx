'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  customerName: string | null;
  createdAt: string;
};

type Props = { productId: string };

export function ProductReviews({ productId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [needAuth, setNeedAuth] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/storefront/reviews?productId=${encodeURIComponent(productId)}`);
    const data = await res.json();
    if (data.success) {
      setReviews(data.reviews || []);
      setAverage(data.averageRating || 0);
      setCount(data.reviewCount || 0);
    }
  }

  useEffect(() => {
    void load();
  }, [productId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setNeedAuth(false);
    try {
      const res = await fetch('/api/storefront/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, title: title || undefined, body: body || undefined }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setNeedAuth(true);
        return;
      }
      if (!data.success) throw new Error(data.error || 'Failed');
      setMsg(data.updated ? 'Review updated' : 'Thanks for your review');
      setTitle('');
      setBody('');
      await load();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 space-y-6 border-t border-slate-200 pt-8" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="reviews-heading" className="text-lg font-bold text-slate-900">
            Customer reviews
          </h2>
          <p className="text-sm text-slate-600">
            {count > 0 ? (
              <>
                <span className="font-semibold text-slate-900">{average.toFixed(1)}</span> / 5 · {count}{' '}
                {count === 1 ? 'review' : 'reviews'}
              </>
            ) : (
              'No reviews yet — be the first.'
            )}
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{r.customerName || 'Customer'}</p>
              <p className="text-xs font-bold text-amber-700" aria-label={`${r.rating} out of 5 stars`}>
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)}
              </p>
            </div>
            {r.title && <p className="mt-1 text-sm font-medium text-slate-800">{r.title}</p>}
            {r.body && <p className="mt-1 text-sm text-slate-600">{r.body}</p>}
          </li>
        ))}
      </ul>

      <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-900">Write a review</h3>
        <div>
          <label htmlFor="review-rating" className="text-xs font-semibold text-slate-600 block mb-1">
            Rating
          </label>
          <select
            id="review-rating"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="review-title" className="text-xs font-semibold text-slate-600 block mb-1">
            Title (optional)
          </label>
          <input
            id="review-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="review-body" className="text-xs font-semibold text-slate-600 block mb-1">
            Review (optional)
          </label>
          <textarea
            id="review-body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        {needAuth && (
          <p className="text-xs text-slate-600">
            <Link href="/shop/login" className="font-semibold text-emerald-700 hover:underline">
              Sign in
            </Link>{' '}
            to post a review.
          </p>
        )}
        {msg && (
          <p role="status" className="text-xs text-emerald-700">
            {msg}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Submit review'}
        </button>
      </form>
    </section>
  );
}
