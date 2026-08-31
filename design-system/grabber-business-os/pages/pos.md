# POS Page Overrides

> **PROJECT:** Grabber Business OS (SOLO)
> Overrides `MASTER.md` for `/pos` counter till.

---

## Page-Specific Rules

### Layout

- Full-bleed ops surface inside shell (not marketing hero)
- Split: **catalog 7** / **cart 5** on `lg+`; stack on mobile with cart sticky bottom CTA
- Density 9: compact product tiles, large pay button
- `min-h` not fixed `h` so 400% zoom does not clip

### Color / Status

- Active tender / discount: emerald border-2 + `bg-emerald-500/10`
- Void / PIN fail: destructive text + `role="alert"`
- Stock chip: muted pill; low stock → amber

### Interaction (till)

- Focus barcode after every add / modal close
- Live region (`aria-live="polite"`) for add/remove/complete/unknown barcode
- All qty ±, tender, discount ≥44×44
- Keyboard: Enter submits barcode/PIN; Escape closes modals
- Shortcuts (target parity with MyPoz): F1 pay, F2 search focus — document when wired

### Components

- Payment / PIN / Receipt → shared `<Modal>`
- Tender group = `fieldset` + `role="radio"`
- Primary pay CTA = emerald full-width, min-h 48

### Avoid

- Emoji lock icons — use Lucide `Lock`
- Hover-only feedback for pay / void
- Tiny 20px qty hit targets
