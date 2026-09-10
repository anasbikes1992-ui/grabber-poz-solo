# Grabber Business OS — Product Audit

**Updated:** after AUD-01…AUD-10 · **Full-proof plan:** [`FULL_PROOF_PLAN.md`](./FULL_PROOF_PLAN.md)  
**Canvas:** [full-proof-plan](file:///C:/Users/pc/.cursor/projects/d-GRABBER-POZ-SOLO/canvases/full-proof-plan.canvas.tsx)  

---

## Status: P0 + P1 audit backlog CLOSED

Next execution track is **Phase 0 prove → Phase 1 polish** (see full-proof plan), not more AUD-* IDs.

| ID | Item | Status |
|----|------|--------|
| AUD-01 | Flag-gated hub/header | DONE |
| AUD-02 | Grocery FEFO UI | DONE |
| AUD-03 | Category SEO + sitemap | DONE |
| AUD-04 | Integration health banners | DONE |
| AUD-05 | Hybrid POS mode bar | DONE (Retail/Scan + vertical deep-links) |
| AUD-06 | Restaurant seed/table create | DONE |
| AUD-07 | Polim POST/PATCH | DONE |
| AUD-08 | Categories PATCH/DELETE | DONE |
| AUD-09 | In-house courier fallback | DONE |
| AUD-10 | Setup ↔ Onboarding tabs | DONE |

Also: public surface isolation for `/shop`, `/track`, `/collections` (staff chrome no longer bleeds).

---

## What to do next

### A. Operator go-live (highest ROI this week)

1. Rotate owner PIN  
2. Meta WhatsApp webhook + live COD proof in automation logs  
3. Smoke: POS sale → return → GRN → grocery lot intake (if grocery flag on)  
4. Open `/settings` — confirm health banners match env truth  

### B. Engineering P2 (quality & growth)

| Priority | Item | Why |
|----------|------|-----|
| P2-1 | A11y: Field + drawers + landing mobile nav | AA + phone traffic |
| P2-2 | Local SEO `/locations` pages | Unused `local-seo.ts` |
| P2-3 | True in-POS TABLE_SERVICE (not just link) | Restaurant depth |
| P2-4 | Wishlist / reviews | Storefront conversion |
| P2-5 | CRM segments + Jarvis targeting | Marketing loop |
| P2-6 | Lighthouse product/checkout | Mobile perf claims |
| P2-7 | DB-06 drop legacy columns | Schema hygiene |
| P2-8 | FAL key / creative media | Close Creative stub |

### C. Commercial

- 3 lighthouse merchants (fashion, phone repair, café)  
- Package pitch from GTM plan (LKR 125k + 5k/mo)  
- Case study: unified stock POS + storefront  

---

## Suggested decision

| If you want… | Do this next |
|--------------|--------------|
| **Ship to a paying client** | Operator checklist A |
| **Product polish** | P2-1 a11y + mobile landing |
| **Restaurant depth** | P2-3 in-POS table mode |
| **Marketing SEO** | P2-2 locations pages |
| **More verticals** | Public dining QR menu / WhatsApp inbox |

P0/P1 audit work is complete — pick one lane above; default recommendation is **Operator go-live + A11y P2-1**.
