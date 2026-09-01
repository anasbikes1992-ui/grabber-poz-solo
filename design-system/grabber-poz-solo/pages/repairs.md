# Repairs — Page Overrides

Master: [`../MASTER.md`](../MASTER.md)

## Rules (override Master for `/shop/repairs*`)

- **Accent:** repair teal `#0F766E` on `--sf-repair` / `--sf-repair-muted` — do not replace gold primary CTA on products.
- **Status colors:** amber = awaiting approval; blue = diagnosis/in progress; green = ready; always include text labels.
- **Wizard:** sticky bottom Continue/Back; min-height 44px controls; visible field labels.
- **No cart:** repair CTA goes to `/shop/repairs/request`, never add-to-bag.
- **Motion:** framer-motion step transitions 250ms; respect `prefers-reduced-motion`.
- **Mobile:** bottom nav includes Repairs + Track; no horizontal scroll.
