import { redirect } from 'next/navigation';

/** Legacy /store path → public storefront landing */
export default function StoreRedirectPage() {
  redirect('/');
}
