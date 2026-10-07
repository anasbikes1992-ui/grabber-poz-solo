import { PublicInfoPage } from '@/components/company/PublicInfoPage';
import { companyWhatsappNumber } from '@/lib/public/contact-links';
import { safeJsonLd } from '@/lib/security/escape';
import { buildLegalMetadata, getLegalPage, legalPageJsonLd } from '@/lib/public/legal-pages';

const page = getLegalPage('privacy');

export const metadata = buildLegalMetadata(page);

export default function PrivacyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(legalPageJsonLd(page)) }} />
      <PublicInfoPage page={page} salesWhatsapp={companyWhatsappNumber()} />
    </>
  );
}
