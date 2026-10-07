export function publicWhatsAppHref(raw?: string | null, message?: string) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}
