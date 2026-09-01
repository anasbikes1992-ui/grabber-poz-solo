import { redirect } from 'next/navigation';

/** Legacy mock page — use /settings for onboarding */
export default function SetupRedirectPage() {
  redirect('/settings');
}
