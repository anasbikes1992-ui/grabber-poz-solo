# Grabber POZ Public SEO, Legal Pages, and WhatsApp Plan

Last updated: 2026-10-07

## Goal

Make the public company and store surfaces trustworthy, crawlable, and conversion-ready without changing POS, checkout, stock, payment, or tenant-isolation logic.

## Completed in this milestone

- Public legal/trust pages:
  - `/terms`
  - `/privacy`
  - `/delivery-policy`
  - `/refund-policy`
  - `/contact`
- Footer links added to:
  - company landing page
  - storefront home
  - checkout agreement text
- SEO basics:
  - canonical metadata for new pages
  - title and meta descriptions for new pages
  - one H1 per new page
  - clean H2 section hierarchy
  - WebPage / ContactPage JSON-LD and BreadcrumbList schema
  - legal/contact pages added to sitemap
  - login and checkout removed from sitemap
  - staff/company/admin/login/checkout surfaces disallowed in robots
  - `/llms.txt` added
  - favicon metadata added and `public/favicon.ico` created
- Company WhatsApp:
  - public WhatsApp inquiry link uses `COMPANY_SALES_WHATSAPP` or `OWNER_WHATSAPP`
  - existing lead automation remains the source of truth for owner alerts and prospect replies
  - Google Search Console verification is supported through `GOOGLE_SITE_VERIFICATION`

## Still required before final SEO sign-off

1. Configure production environment:
   - `APP_URL=https://grabberpoz.com`
   - `COMPANY_SALES_WHATSAPP=94XXXXXXXXX`
   - `GOOGLE_SITE_VERIFICATION=<token from Search Console>`
2. Redeploy production.
3. Submit `https://grabberpoz.com/sitemap.xml` in Google Search Console.
4. Run a live crawl after deploy:
   - `/`
   - `/shop`
   - `/terms`
   - `/privacy`
   - `/delivery-policy`
   - `/refund-policy`
   - `/contact`
   - `/robots.txt`
   - `/sitemap.xml`
   - `/llms.txt`
5. Confirm Search Console ownership.

## Next milestones

### Milestone 2 - Public page polish

- Add richer FAQ content only where it appears visibly on the page.
- Add FAQPage schema only for visible FAQ blocks.
- Add stronger internal links from feature sections to policies and contact.
- Review mobile spacing at 375px, 768px, 1024px, and 1440px.

### Milestone 3 - Core Web Vitals

- Run Lighthouse/PageSpeed on company home and storefront.
- Identify LCP element on each public page.
- Keep hero assets preloaded/reserved.
- Convert remaining raw product/admin images to `next/image` where safe.
- Split large public chunks where they affect first load.

### Milestone 4 - Content and local SEO

- Create landing sections for high-intent Sri Lankan queries:
  - POS system Sri Lanka
  - retail inventory software Sri Lanka
  - Polim Potha software
  - online store and POS Sri Lanka
- Add location pages only for real serviced regions.
- Avoid duplicate thin pages.

### Milestone 5 - Security hardening

- Keep source maps disabled in production.
- Keep HTTPS/HSTS enabled.
- Tighten CSP by replacing broad `unsafe-inline`/`unsafe-eval` with nonce/hash strategy when feasible.
- Move rate limiting to a durable store before horizontal scaling.

## Do not do

- Do not index staff, POS, company admin, checkout, login, or API routes.
- Do not add schema for content that is not visible on the page.
- Do not hardcode Search Console tokens, WhatsApp access tokens, or customer credentials in git.
- Do not create near-duplicate keyword pages just to inflate sitemap size.
