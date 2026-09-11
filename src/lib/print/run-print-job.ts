/**
 * Browser print helper — sets body mode class + @page size, then cleans up.
 */

export function runPrintJob(
  mode: 'receipt' | 'labels',
  opts: {
    /** CSS @page size value, e.g. "72mm auto" or "50mm 30mm" or "A4" */
    pageSize: string;
    margin?: string;
  },
) {
  if (typeof window === 'undefined') return;

  const className = mode === 'receipt' ? 'print-mode-receipt' : 'print-mode-labels';
  document.body.classList.add(className);

  const existing = document.getElementById('grabber-print-page-style');
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.id = 'grabber-print-page-style';
  style.textContent = `
    @media print {
      @page {
        size: ${opts.pageSize};
        margin: ${opts.margin ?? '0'};
      }
    }
  `;
  document.head.appendChild(style);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove(className);
    style.remove();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  // Some browsers fire afterprint unreliably — safety net
  window.setTimeout(cleanup, 60_000);

  // Defer so class + style apply before dialog paints
  window.requestAnimationFrame(() => {
    window.print();
  });
}
