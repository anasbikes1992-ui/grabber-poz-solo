import { redirect } from 'next/navigation';

/** Legacy staff login URL → canonical /adminpoz */
export default async function LoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; rotate?: string }>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.next) q.set('next', sp.next);
  if (sp.rotate) q.set('rotate', sp.rotate);
  const qs = q.toString();
  redirect(qs ? `/adminpoz?${qs}` : '/adminpoz');
}
