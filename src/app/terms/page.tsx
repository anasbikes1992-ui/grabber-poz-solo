import { PublicInfoPage } from '@/components/company/PublicInfoPage';
import { buildLegalMetadata, getLegalPage, legalPageJsonLd } from '@/lib/public/legal-pages';

const page = getLegalPage('terms');

export const metadata = buildLegalMetadata(page);

export default function TermsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(legalPageJsonLd(page)) }} />
      <PublicInfoPage page={page} salesWhatsapp={process.env.COMPANY_SALES_WHATSAPP || process.env.OWNER_WHATSAPP} />
    </>
  );
}
