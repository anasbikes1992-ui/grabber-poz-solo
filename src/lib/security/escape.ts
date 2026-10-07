/** HTML-escape untrusted text for interpolation into HTML strings. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Serialize JSON for an inline <script type="application/ld+json"> block.
 * Escapes characters that could terminate the script element or the HTML comment context.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(' ').join('\\u2028')
    .split(' ').join('\\u2029');
}
