import { PublicInfoPage } from '@/components/company/PublicInfoPage';
import { buildLegalMetadata, getLegalPage, legalPageJsonLd } from '@/lib/public/legal-pages';

const page = getLegalPage('privacy');

export const metadata = buildLegalMetadata(page);

export default function PrivacyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(legalPageJsonLd(page)) }} />
      <PublicInfoPage page={page} salesWhatsapp={process.env.COMPANY_SALES_WHATSAPP || process.env.OWNER_WHATSAPP} />
    </>
  );
}
