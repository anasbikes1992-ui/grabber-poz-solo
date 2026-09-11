'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, LogOut, ArrowRight, Lock } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { getDefaultRouteForRole } from '@/lib/auth/rbac-rules';
import type { SessionRole } from '@/lib/auth/session-edge';

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get('from') || '/app';
  const role = (searchParams.get('role') as SessionRole) || 'CASHIER';

  const defaultWorkspace = getDefaultRouteForRole(role);

  const handleSwitchAccount = async () => {
    try {
      await fetch('/api/auth/login', { method: 'DELETE' });
    } catch {
      // Ignore
    }
    router.push('/adminpoz');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-lg p-8 rounded-2xl glass-card border border-destructive/30 shadow-2xl space-y-6 text-center">
        <div className="flex justify-center mb-2">
          <BrandLogo size="md" showTagline />
        </div>

        <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto text-destructive animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Restricted</h1>
          <p className="text-sm text-muted-foreground">
            Your current role <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{role}</span> does not have authorization to access <span className="font-mono text-xs text-foreground bg-zinc-800 px-1.5 py-0.5 rounded">{from}</span>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-left space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Lock className="w-3.5 h-3.5 text-destructive" />
            <span>Role-Based Access Control (RBAC) Enforcement</span>
          </div>
          <p>
            Sensitive operations such as store settings, root inventory manipulation, financial general ledgers, and staff configurations require manager or owner clearance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href={defaultWorkspace}
            className="flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-glow-em transition cursor-pointer"
          >
            <span>Open {role} Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleSwitchAccount}
            className="flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-foreground font-semibold text-xs border border-zinc-700 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Role / Sign In</span>
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Need higher access? Contact your business owner or store administrator.
        </p>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <UnauthorizedContent />
    </Suspense>
  );
}
