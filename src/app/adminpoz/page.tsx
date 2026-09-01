import { Suspense } from 'react';
import LoginClient from '../login/login-client';

/** Staff / admin login — not linked from public storefront. Bookmark: /adminpoz */
export default function AdminPozPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <LoginClient />
    </Suspense>
  );
}
