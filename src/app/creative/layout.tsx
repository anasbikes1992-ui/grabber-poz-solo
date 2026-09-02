import Link from 'next/link';
import { CreativeNav } from '@/components/creative/creative-nav';

export default function CreativeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Grabber Creative Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">
            PDF, video, and UGC tools — managed from the Social Channel Manager.
          </p>
        </div>
        <Link href="/social" className="text-[11px] text-indigo-600 font-semibold hover:underline shrink-0 mt-1">
          ← Social Hub
        </Link>
      </div>
      <CreativeNav />
      {children}
    </div>
  );
}
