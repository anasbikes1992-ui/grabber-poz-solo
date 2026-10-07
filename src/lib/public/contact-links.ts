export function publicWhatsAppHref(raw?: string | null, message?: string) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}

/** Sales WhatsApp number, read at request time: COMPANY_WHATSAPP_NUMBER → COMPANY_SALES_WHATSAPP → OWNER_WHATSAPP. */
export function companyWhatsappNumber(env: Record<string, string | undefined> = process.env): string {
  return env.COMPANY_WHATSAPP_NUMBER || env.COMPANY_SALES_WHATSAPP || env.OWNER_WHATSAPP || '';
}
