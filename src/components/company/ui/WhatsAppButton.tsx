import { MessageCircle } from 'lucide-react';
import { whatsappHref } from '@/lib/storefront/theme-vars';

export const COMPANY_WHATSAPP_MESSAGE = "Hi Grabber POZ, I'd like a demo for my shop.";

/** Floating "Chat on WhatsApp" button. Renders nothing when no number is configured. */
export function WhatsAppFloat({ number }: { number?: string }) {
  const href = whatsappHref(number, COMPANY_WHATSAPP_MESSAGE);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#128C4A] px-5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-[#0E6F3B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#128C4A]"
    >
      <MessageCircle className="h-5 w-5" aria-hidden />
      <span>Chat on WhatsApp</span>
    </a>
  );
}
