'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  LayoutTemplate,
  FileText,
  Video,
  Megaphone,
  Sparkles,
  Palette,
  FolderOpen,
} from 'lucide-react';
import { CREATIVE_NAV } from '@/lib/creative/kinds';

const ICONS = {
  LayoutDashboard,
  Package,
  LayoutTemplate,
  FileText,
  Video,
  Megaphone,
  Sparkles,
  Palette,
  FolderOpen,
} as const;

export function CreativeNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1.5 pb-4 border-b border-border mb-6">
      {CREATIVE_NAV.map((item) => {
        const Icon = ICONS[item.icon as keyof typeof ICONS];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-colors ${
              active
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600'
                : 'border-border text-muted-foreground hover:border-indigo-500/40 hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
