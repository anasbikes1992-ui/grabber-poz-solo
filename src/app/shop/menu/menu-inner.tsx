'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import type { StorefrontConfig } from '@/lib/config/storefront-config.shared';
import { DEFAULT_STOREFRONT } from '@/lib/config/storefront-config.shared';
import { DEFAULT_VERTICAL_FLAGS, type VerticalFlags } from '@/lib/config/vertical-flags';
import { formatCurrency } from '@/lib/currency/fx-rates';

type MenuItem = {
  id: string;
  name: string;
  salePrice: number;
  description?: string | null;
  category: string;
  imageUrl?: string | null;
};

export default function PublicDiningMenu({
  cms = DEFAULT_STOREFRONT,
  verticalFlags = DEFAULT_VERTICAL_FLAGS,
}: {
  cms?: StorefrontConfig;
  verticalFlags?: VerticalFlags;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/restaurant/menu')
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || 'Failed');
        setItems(d.items || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  const byCat = items.reduce<Record<string, MenuItem[]>>((acc, i) => {
    const k = i.category || 'Menu';
    (acc[k] = acc[k] || []).push(i);
    return acc;
  }, {});

  return (
    <StorefrontShell cms={cms} verticalFlags={verticalFlags}>
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-[var(--sf-foreground)]">Dining menu</h1>
        <p className="mt-2 text-sm text-[var(--sf-secondary)]">
          Scan a table QR for table context — or browse the full menu. Ask staff to fire your order.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-[var(--sf-accent)]">
            {error}
          </p>
        )}
        <div className="mt-8 space-y-8">
          {Object.entries(byCat).map(([cat, list]) => (
            <div key={cat}>
              <h2 className="mb-3 border-b border-[var(--sf-border)] pb-2 text-lg font-bold text-[var(--sf-foreground)]">
                {cat}
              </h2>
              <ul className="space-y-3">
                {list.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--sf-foreground)]">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-[var(--sf-secondary)] mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <p className="shrink-0 font-mono text-sm text-[var(--sf-foreground)]">
                      {formatCurrency(Number(item.salePrice))}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {items.length === 0 && !error && (
            <p className="text-sm text-[var(--sf-secondary)]">Menu empty — seed restaurant preset.</p>
          )}
        </div>
        <p className="mt-10 text-xs text-[var(--sf-secondary)]">
          Book salon?{' '}
          <Link href="/shop/appointments/book" className="underline">
            Appointments
          </Link>
        </p>
      </section>
    </StorefrontShell>
  );
}
