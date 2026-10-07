import { PublicInfoPage } from '@/components/company/PublicInfoPage';
import { companyWhatsappNumber } from '@/lib/public/contact-links';
import { safeJsonLd } from '@/lib/security/escape';
import { buildLegalMetadata, getLegalPage, legalPageJsonLd } from '@/lib/public/legal-pages';

const page = getLegalPage('refund-policy');

export const metadata = buildLegalMetadata(page);

export default function RefundPolicyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(legalPageJsonLd(page)) }} />
      <PublicInfoPage page={page} salesWhatsapp={companyWhatsappNumber()} />
    </>
  );
}
