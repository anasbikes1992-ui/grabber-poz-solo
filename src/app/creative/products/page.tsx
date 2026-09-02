'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, FileText, Video, Megaphone } from 'lucide-react';

type Product = { id: string; name: string; sku: string; salePrice: string; imageUrl?: string | null };

export default function CreativeProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    void fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts((d.products || d.items || []) as Product[]))
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Package className="h-5 w-5 text-indigo-500" /> Products
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Pick a product to start PDF, video, or UGC campaigns.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((p) => (
          <div key={p.id} className="p-4 rounded-2xl bg-card border border-border space-y-3">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt={p.name} className="w-full h-28 object-cover rounded-lg" />
            ) : (
              <div className="w-full h-28 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground text-xs">No image</div>
            )}
            <div>
              <h3 className="font-bold text-sm">{p.name}</h3>
              <p className="text-[10px] text-muted-foreground">{p.sku} · LKR {Number(p.salePrice).toLocaleString()}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Link href={`/creative/pdf?product=${p.id}`} className="text-[10px] px-2 py-1 rounded-lg border border-border hover:border-indigo-500/40 inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> PDF
              </Link>
              <Link href={`/creative/videos?product=${p.name}`} className="text-[10px] px-2 py-1 rounded-lg border border-border hover:border-indigo-500/40 inline-flex items-center gap-1">
                <Video className="h-3 w-3" /> Video
              </Link>
              <Link href={`/creative/ugc-ads?product=${p.id}`} className="text-[10px] px-2 py-1 rounded-lg border border-border hover:border-indigo-500/40 inline-flex items-center gap-1">
                <Megaphone className="h-3 w-3" /> UGC
              </Link>
            </div>
          </div>
        ))}
      </div>
      {!products.length && <p className="text-sm text-muted-foreground">No products — add inventory first.</p>}
    </div>
  );
}
