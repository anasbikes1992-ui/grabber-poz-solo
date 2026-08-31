# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/grabber-business-os/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Grabber Business OS (SOLO)
**Aligned to:** Grabber MyPoz visual language (zinc-950 + emerald/lime + glass)
**Generated / locked:** 2026-08-31
**Category:** Retail POS / Commerce OS
**Design Dials:** Variance 4/10 (Balanced) | Motion 5/10 (Standard) | Density 8/10 (Dense ops)

Source: `ui-ux-pro-max` (`--design-system`) + MyPoz production shell (`D:\GRABBER MYPOZ`).

---

## Global Rules

### Color Palette (MyPoz-aligned)

| Role | Hex | Token / usage |
|------|-----|---------------|
| Background | `#09090B` | `--background` / `bg-zinc-950` |
| Foreground | `#FAFAFA` | `--foreground` |
| Card | `#141417` | `--card` / glass surfaces |
| Muted | `#27272A` | `--muted` / borders soft |
| Muted FG | `#A1A1AA` | secondary labels |
| Border | `#27272A` | `--border` |
| Accent / CTA | `#10B981` | emerald-500 primary actions |
| Brand neon | `#A3E635` | lime-400 logo / active POS |
| On accent | `#09090B` | text on emerald buttons |
| Destructive | `#EF4444` | voids, PIN fail, variance |
| Warning | `#F59E0B` | amber drawer discrepancy |
| Focus ring | `#34D399` | emerald-400 ≥3:1 on card |

**Notes:** Dark-first. Green = money/success. Never pure `#000` (OLED smear). Status: green / amber / red only.

### Typography

- **UI / Body:** Plus Jakarta Sans (same as MyPoz)
- **Mood:** retail, clean, conversion, dense ops
- **Next font:** `Plus_Jakarta_Sans` → `--font-plus-jakarta`
- **Base size:** 16px root; dense till UI may use 12–14px labels but keep controls ≥44px
- **Line-height:** ~1.5 body; tabular nums for money (`font-mono` / `tabular-nums`)

### Spacing (Density 8)

| Token | Value |
|-------|-------|
| `--space-xs` | 2px |
| `--space-sm` | 4px |
| `--space-md` | 8px |
| `--space-lg` | 12px |
| `--space-xl` | 16px |
| `--space-2xl` | 24px |
| `--space-3xl` | 32px |

### Motion

- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (Expo.out)
- Hover / press: 150–250ms; press scale `0.97 → 1.0` without layout shift
- Respect `prefers-reduced-motion`
- Catalog grid: optional mild stagger; **no** `back.out` on data tables

### Surfaces & Effects

- **mesh-bg:** emerald / purple / blue radial washes on shell
- **glass-panel / glass-card:** blur + 7–8% white border
- **glass-card-hover:** emerald border glow + `translateY(-2px)`
- **Header:** sticky blur + ambient gradient hairline (`emerald → teal → purple → amber`)
- Icons: Lucide outline only — **no emoji icons**

---

## Component Specs

### Primary CTA

```
bg-emerald-500 text-zinc-950 font-bold rounded-xl
hover:bg-emerald-400 active:scale-[0.97]
min-h-[44px] cursor-pointer transition 200ms
```

### Secondary

```
bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl
hover:bg-zinc-800
```

### Cards

```
glass-card rounded-2xl p-4
hover: glass-card-hover (interactive only)
```

### Inputs

```
bg-zinc-900/80 border border-zinc-800 rounded-xl
text-base (16px) on mobile to avoid iOS zoom
focus-visible: ring-2 ring-emerald-400/60
```

### Modals

- Shared `<Modal>`: trap focus, Escape, restore focus, `aria-modal`
- Overlay: `bg-zinc-950/80 backdrop-blur-sm`

### Brand

- Use `<BrandLogo />` — lime GRABBER + hand glyph (MyPoz parity)
- Solo badge: small `SOLO` chip (emerald outline) for single-tenant edition

---

## Anti-Patterns

- ❌ Flat gray UI without glass/depth
- ❌ Purple-on-white default AI look
- ❌ Emoji as icons
- ❌ Missing `cursor-pointer`
- ❌ Instant state changes (0ms)
- ❌ Invisible focus rings
- ❌ Text-heavy dashboard chrome
- ❌ Hardcoded client emails in chrome

---

## Pre-Delivery Checklist

- [ ] Lucide icons only
- [ ] `cursor-pointer` on clickables
- [ ] 150–300ms transitions
- [ ] Contrast ≥4.5:1 body; destructive readable on dark
- [ ] Focus-visible rings
- [ ] `prefers-reduced-motion`
- [ ] Breakpoints 375 / 768 / 1024 / 1440
- [ ] Touch targets ≥44×44 on POS
