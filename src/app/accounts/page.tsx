import { redirect } from 'next/navigation';

/** Legacy mock GL page — use /reports for sales analytics */
export default function AccountsRedirectPage() {
  redirect('/reports');
}
