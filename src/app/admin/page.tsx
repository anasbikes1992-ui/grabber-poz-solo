import { Suspense } from 'react';
import LoginClient from '../login/login-client';

export const metadata = {
  title: 'Admin Access Gate | Grabber Business OS',
  description: 'Staff & admin authentication gateway',
};

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <LoginClient />
    </Suspense>
  );
}
