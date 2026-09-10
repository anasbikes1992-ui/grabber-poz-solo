'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StorefrontShell } from '@/components/storefront/storefront-shell';

type MenuItem = {
  id: string;
  name: string;
  salePrice: number;
  description?: string | null;
  category: string;
};

export default function TableQrMenuPage() {
  const params = useParams();
  const token = String(params?.tableToken || '');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tableName, setTableName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void fetch(`/api/restaurant/menu?table=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || 'Failed');
        setItems(d.items || []);
        setTableName(d.table?.name || null);
        if (!d.table) setError('Unknown table QR — ask staff for a new code.');
      })
      .catch((e) => setError(e.message));
  }, [token]);

  return (
    <StorefrontShell>
      <section className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sf-accent)]">
          {tableName || 'Table'}
        </p>
        <h1 className="font-display text-3xl font-bold mt-1">Your menu</h1>
        <p className="mt-2 text-sm text-[var(--sf-secondary)]">
          Show this page to your waiter to order — guest self-checkout is not enabled on Solo.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-amber-700">
            {error}
          </p>
        )}
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 border-b border-zinc-100 pb-2">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-[10px] text-[var(--sf-secondary)]">{item.category}</p>
              </div>
              <p className="font-mono text-sm">LKR {Number(item.salePrice).toFixed(0)}</p>
            </li>
          ))}
        </ul>
        <Link href="/shop/menu" className="mt-8 inline-block text-sm underline">
          Full menu
        </Link>
      </section>
    </StorefrontShell>
  );
}
