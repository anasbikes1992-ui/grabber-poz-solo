import { redirect } from 'next/navigation';

/** Legacy mock page — use /products and /categories instead */
export default function CollectionsRedirectPage() {
  redirect('/products');
}
