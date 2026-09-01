import { redirect } from 'next/navigation';

/** Legacy mock page — use /quotations for B2B pricing */
export default function WholesaleRedirectPage() {
  redirect('/quotations');
}
