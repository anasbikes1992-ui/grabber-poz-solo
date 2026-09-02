import { redirect } from 'next/navigation';

/** Legacy route — unified Social Channel Manager. */
export default function MarketingRedirectPage() {
  redirect('/social?tab=channels');
}
