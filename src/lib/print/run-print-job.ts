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

  if (mode === 'receipt') {
    const receipt = document.getElementById('printable-thermal-receipt');
    if (receipt) {
      const receiptFrame = document.createElement('iframe');
      receiptFrame.title = 'Grabber receipt print';
      receiptFrame.setAttribute('aria-hidden', 'true');
      receiptFrame.style.position = 'fixed';
      receiptFrame.style.right = '0';
      receiptFrame.style.bottom = '0';
      receiptFrame.style.width = '0';
      receiptFrame.style.height = '0';
      receiptFrame.style.border = '0';
      receiptFrame.style.opacity = '0';
      document.body.appendChild(receiptFrame);

      const frameDocument = receiptFrame.contentDocument || receiptFrame.contentWindow?.document;
      if (!frameDocument) {
        receiptFrame.remove();
        return;
      }

      const clonedReceipt = receipt.cloneNode(true) as HTMLElement;
      clonedReceipt.removeAttribute('class');
      clonedReceipt.style.display = 'block';
      clonedReceipt.style.position = 'static';
      clonedReceipt.style.margin = '0';

      frameDocument.open();
      frameDocument.write(`<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Receipt</title>
            <style>
              @page { size: ${opts.pageSize}; margin: ${opts.margin ?? '0'}; }
              html, body {
                margin: 0;
                padding: 0;
                width: fit-content;
                min-height: 0;
                background: #fff;
                color: #000;
                overflow: visible;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              * {
                box-sizing: border-box;
              }
              body {
                font-family: "Courier New", Courier, monospace;
              }
              #printable-thermal-receipt {
                display: block !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: 0 !important;
                break-inside: avoid;
                page-break-inside: avoid;
              }
              svg {
                max-width: 100%;
              }
            </style>
          </head>
          <body></body>
        </html>`);
      frameDocument.close();
      frameDocument.body.appendChild(clonedReceipt);

      const cleanupFrame = () => {
        window.setTimeout(() => receiptFrame.remove(), 500);
      };

      receiptFrame.contentWindow?.addEventListener('afterprint', cleanupFrame, { once: true });
      window.setTimeout(cleanupFrame, 60_000);
      window.setTimeout(() => {
        receiptFrame.contentWindow?.focus();
        receiptFrame.contentWindow?.print();
      }, 50);
      return;
    }
  }

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
